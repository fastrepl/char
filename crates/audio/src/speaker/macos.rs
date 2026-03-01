use std::any::TypeId;
use std::sync::Arc;
use std::sync::atomic::{AtomicU32, AtomicUsize, Ordering};
use std::task::Poll;

use anyhow::Result;
use futures_util::Stream;
use futures_util::task::AtomicWaker;
use hypr_audio_utils::{pcm_f32_to_f32, pcm_f64_to_f32, pcm_i16_to_f32, pcm_i32_to_f32};
use pin_project::pin_project;

use ringbuf::{
    HeapCons, HeapProd, HeapRb,
    traits::{Consumer, Producer, Split},
};

use ca::aggregate_device_keys as agg_keys;
use cidre::{arc, av, cat, cf, core_audio as ca, ns, os};

const MAX_CONVERSION_SAMPLES: usize = 8192;

pub struct SpeakerInput {
    tap: ca::TapGuard,
    agg_desc: arc::Retained<cf::DictionaryOf<cf::String, cf::Type>>,
}

#[pin_project(PinnedDrop)]
pub struct SpeakerStream {
    consumer: HeapCons<f32>,
    _device: ca::hardware::StartedDevice<ca::AggregateDevice>,
    _ctx: Box<Ctx>,
    _tap: ca::TapGuard,
    waker: Arc<AtomicWaker>,
    current_sample_rate: Arc<AtomicU32>,
    read_buffer: Vec<f32>,
    dropped_samples: Arc<AtomicUsize>,
}

impl SpeakerStream {
    pub fn sample_rate(&self) -> u32 {
        self.current_sample_rate.load(Ordering::Acquire)
    }
}

struct Ctx {
    format: arc::R<av::AudioFormat>,
    producer: HeapProd<f32>,
    waker: Arc<AtomicWaker>,
    current_sample_rate: Arc<AtomicU32>,
    dropped_samples: Arc<AtomicUsize>,
    conversion_buffer: Vec<f32>,
}

use super::{BUFFER_SIZE, CHUNK_SIZE};

impl SpeakerInput {
    pub fn new() -> Result<Self> {
        let tap_desc = ca::TapDesc::with_mono_global_tap_excluding_processes(&ns::Array::new());
        let tap = tap_desc.create_process_tap()?;

        let sub_tap = cf::DictionaryOf::with_keys_values(
            &[ca::sub_device_keys::uid()],
            &[tap.uid().unwrap().as_type_ref()],
        );

        let agg_desc = cf::DictionaryOf::with_keys_values(
            &[
                agg_keys::is_private(),
                agg_keys::tap_auto_start(),
                agg_keys::name(),
                agg_keys::uid(),
                agg_keys::tap_list(),
            ],
            &[
                cf::Boolean::value_true().as_type_ref(),
                cf::Boolean::value_false(),
                cf::String::from_str(crate::TAP_DEVICE_NAME).as_ref(),
                &cf::Uuid::new().to_cf_string(),
                &cf::ArrayOf::from_slice(&[sub_tap.as_ref()]),
            ],
        );

        Ok(Self { tap, agg_desc })
    }

    pub fn sample_rate(&self) -> u32 {
        self.tap.asbd().unwrap().sample_rate as u32
    }

    fn start_device(
        &self,
        ctx: &mut Box<Ctx>,
    ) -> Result<ca::hardware::StartedDevice<ca::AggregateDevice>> {
        extern "C" fn proc(
            device: ca::Device,
            _now: &cat::AudioTimeStamp,
            input_data: &cat::AudioBufList<1>,
            _input_time: &cat::AudioTimeStamp,
            _output_data: &mut cat::AudioBufList<1>,
            _output_time: &cat::AudioTimeStamp,
            ctx: Option<&mut Ctx>,
        ) -> os::Status {
            let ctx = ctx.unwrap();

            let after = device
                .nominal_sample_rate()
                .unwrap_or(ctx.format.absd().sample_rate) as u32;
            let before = ctx.current_sample_rate.load(Ordering::Acquire);

            if before != after {
                ctx.current_sample_rate.store(after, Ordering::Release);
            }

            if let Some(view) =
                av::AudioPcmBuf::with_buf_list_no_copy(&ctx.format, input_data, None)
            {
                if let Some(data) = view.data_f32_at(0) {
                    process_audio_data_rt_safe(ctx, data);
                }
            } else {
                let first_buffer = &input_data.buffers[0];

                if first_buffer.data_bytes_size == 0 || first_buffer.data.is_null() {
                    return os::Status::NO_ERR;
                }

                match ctx.format.common_format() {
                    av::audio::CommonFormat::PcmF32 => {
                        process_samples_rt_safe::<f32>(ctx, first_buffer, pcm_f32_to_f32);
                    }
                    av::audio::CommonFormat::PcmF64 => {
                        process_samples_rt_safe::<f64>(ctx, first_buffer, pcm_f64_to_f32);
                    }
                    av::audio::CommonFormat::PcmI32 => {
                        process_samples_rt_safe::<i32>(ctx, first_buffer, pcm_i32_to_f32);
                    }
                    av::audio::CommonFormat::PcmI16 => {
                        process_samples_rt_safe::<i16>(ctx, first_buffer, pcm_i16_to_f32);
                    }
                    _ => {}
                }
            }

            os::Status::NO_ERR
        }

        let agg_device = ca::AggregateDevice::with_desc(&self.agg_desc)?;
        let proc_id = agg_device.create_io_proc_id(proc, Some(ctx))?;
        let started_device = ca::device_start(agg_device, Some(proc_id))?;

        Ok(started_device)
    }

    pub fn stream(self) -> SpeakerStream {
        let asbd = self.tap.asbd().unwrap();

        let format = av::AudioFormat::with_asbd(&asbd).unwrap();

        let rb = HeapRb::<f32>::new(BUFFER_SIZE);
        let (producer, consumer) = rb.split();

        let waker = Arc::new(AtomicWaker::new());
        let current_sample_rate = Arc::new(AtomicU32::new(asbd.sample_rate as u32));
        let dropped_samples = Arc::new(AtomicUsize::new(0));

        tracing::info!(init = asbd.sample_rate, "sample_rate");

        let mut ctx = Box::new(Ctx {
            format,
            producer,
            waker: waker.clone(),
            current_sample_rate: current_sample_rate.clone(),
            dropped_samples: dropped_samples.clone(),
            conversion_buffer: vec![0.0f32; MAX_CONVERSION_SAMPLES],
        });

        let device = self.start_device(&mut ctx).unwrap();

        SpeakerStream {
            consumer,
            _device: device,
            _ctx: ctx,
            _tap: self.tap,
            waker,
            current_sample_rate,
            read_buffer: vec![0.0f32; CHUNK_SIZE],
            dropped_samples,
        }
    }
}

fn read_samples<T: Copy>(buffer: &cat::AudioBuf) -> Option<&[T]> {
    let byte_count = buffer.data_bytes_size as usize;

    if byte_count == 0 || buffer.data.is_null() {
        return None;
    }

    let sample_count = byte_count / std::mem::size_of::<T>();
    if sample_count == 0 {
        return None;
    }

    Some(unsafe { std::slice::from_raw_parts(buffer.data as *const T, sample_count) })
}

fn process_samples_rt_safe<T>(ctx: &mut Ctx, buffer: &cat::AudioBuf, convert: fn(T) -> f32)
where
    T: Copy + 'static,
{
    let Some(samples) = read_samples::<T>(buffer) else {
        return;
    };

    if samples.is_empty() {
        return;
    }

    if TypeId::of::<T>() == TypeId::of::<f32>() {
        let data =
            unsafe { std::slice::from_raw_parts(samples.as_ptr() as *const f32, samples.len()) };
        process_audio_data_rt_safe(ctx, data);
        return;
    }

    let mut offset = 0usize;
    let chunk_len = ctx.conversion_buffer.len();
    let mut pushed_any = false;

    while offset < samples.len() {
        let end = (offset + chunk_len).min(samples.len());
        let count = end - offset;

        for i in 0..count {
            ctx.conversion_buffer[i] = convert(samples[offset + i]);
        }

        let pushed = ctx.producer.push_slice(&ctx.conversion_buffer[..count]);
        if pushed < count {
            ctx.dropped_samples
                .fetch_add(count - pushed, Ordering::Relaxed);
        }

        if pushed > 0 {
            pushed_any = true;
        }

        offset = end;
    }

    if pushed_any {
        ctx.waker.wake();
    }
}

fn process_audio_data_rt_safe(ctx: &mut Ctx, data: &[f32]) {
    let pushed = ctx.producer.push_slice(data);

    if pushed < data.len() {
        let dropped = data.len() - pushed;
        ctx.dropped_samples.fetch_add(dropped, Ordering::Relaxed);
    }

    if pushed > 0 {
        ctx.waker.wake();
    }
}

impl Stream for SpeakerStream {
    type Item = Vec<f32>;

    fn poll_next(
        self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> Poll<Option<Self::Item>> {
        let this = self.project();

        let dropped = this.dropped_samples.swap(0, Ordering::Relaxed);
        if dropped > 0 {
            tracing::warn!(dropped, "samples_dropped");
        }

        let popped = this.consumer.pop_slice(this.read_buffer);

        if popped > 0 {
            return Poll::Ready(Some(this.read_buffer[..popped].to_vec()));
        }

        this.waker.register(cx.waker());

        let popped = this.consumer.pop_slice(this.read_buffer);
        if popped > 0 {
            return Poll::Ready(Some(this.read_buffer[..popped].to_vec()));
        }

        Poll::Pending
    }
}

#[pin_project::pinned_drop]
impl PinnedDrop for SpeakerStream {
    fn drop(self: std::pin::Pin<&mut Self>) {
        tracing::debug!("SpeakerStream dropping");
    }
}
