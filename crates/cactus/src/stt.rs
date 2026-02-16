use std::ffi::CString;
use std::marker::PhantomData;
use std::path::Path;
use std::ptr::NonNull;

use crate::error::{Error, Result};
use crate::ffi_utils::{RESPONSE_BUF_SIZE, parse_response_buf, read_cstr_from_buf};
use crate::model::Model;
use crate::response::CactusResponse;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    En,
    Zh,
    De,
    Es,
    Ru,
    Ko,
    Fr,
    Ja,
    Pt,
    Tr,
    Pl,
    Ca,
    Nl,
    Ar,
    Sv,
    It,
    Id,
    Hi,
    Fi,
    Vi,
    He,
    Uk,
    El,
    Ms,
    Cs,
    Ro,
    Da,
    Hu,
    Ta,
    No,
    Th,
    Ur,
    Hr,
    Bg,
    Lt,
    La,
    Mi,
    Ml,
    Cy,
    Sk,
    Te,
    Fa,
    Lv,
    Bn,
    Sr,
    Az,
    Sl,
    Kn,
    Et,
    Mk,
    Br,
    Eu,
    Is,
    Hy,
    Ne,
    Mn,
    Bs,
    Kk,
    Sq,
    Sw,
    Gl,
    Mr,
    Pa,
    Si,
    Km,
    Sn,
    Yo,
    So,
    Af,
    Oc,
    Ka,
    Be,
    Tg,
    Sd,
    Gu,
    Am,
    Yi,
    Lo,
    Uz,
    Fo,
    Ht,
    Ps,
    Tk,
    Nn,
    Mt,
    Sa,
    Lb,
    My,
    Bo,
    Tl,
    Mg,
    As,
    Tt,
    Haw,
    Ln,
    Ha,
    Ba,
    Jw,
    Su,
    Yue,
}

impl Language {
    pub fn code(&self) -> &'static str {
        match self {
            Self::En => "en",
            Self::Zh => "zh",
            Self::De => "de",
            Self::Es => "es",
            Self::Ru => "ru",
            Self::Ko => "ko",
            Self::Fr => "fr",
            Self::Ja => "ja",
            Self::Pt => "pt",
            Self::Tr => "tr",
            Self::Pl => "pl",
            Self::Ca => "ca",
            Self::Nl => "nl",
            Self::Ar => "ar",
            Self::Sv => "sv",
            Self::It => "it",
            Self::Id => "id",
            Self::Hi => "hi",
            Self::Fi => "fi",
            Self::Vi => "vi",
            Self::He => "he",
            Self::Uk => "uk",
            Self::El => "el",
            Self::Ms => "ms",
            Self::Cs => "cs",
            Self::Ro => "ro",
            Self::Da => "da",
            Self::Hu => "hu",
            Self::Ta => "ta",
            Self::No => "no",
            Self::Th => "th",
            Self::Ur => "ur",
            Self::Hr => "hr",
            Self::Bg => "bg",
            Self::Lt => "lt",
            Self::La => "la",
            Self::Mi => "mi",
            Self::Ml => "ml",
            Self::Cy => "cy",
            Self::Sk => "sk",
            Self::Te => "te",
            Self::Fa => "fa",
            Self::Lv => "lv",
            Self::Bn => "bn",
            Self::Sr => "sr",
            Self::Az => "az",
            Self::Sl => "sl",
            Self::Kn => "kn",
            Self::Et => "et",
            Self::Mk => "mk",
            Self::Br => "br",
            Self::Eu => "eu",
            Self::Is => "is",
            Self::Hy => "hy",
            Self::Ne => "ne",
            Self::Mn => "mn",
            Self::Bs => "bs",
            Self::Kk => "kk",
            Self::Sq => "sq",
            Self::Sw => "sw",
            Self::Gl => "gl",
            Self::Mr => "mr",
            Self::Pa => "pa",
            Self::Si => "si",
            Self::Km => "km",
            Self::Sn => "sn",
            Self::Yo => "yo",
            Self::So => "so",
            Self::Af => "af",
            Self::Oc => "oc",
            Self::Ka => "ka",
            Self::Be => "be",
            Self::Tg => "tg",
            Self::Sd => "sd",
            Self::Gu => "gu",
            Self::Am => "am",
            Self::Yi => "yi",
            Self::Lo => "lo",
            Self::Uz => "uz",
            Self::Fo => "fo",
            Self::Ht => "ht",
            Self::Ps => "ps",
            Self::Tk => "tk",
            Self::Nn => "nn",
            Self::Mt => "mt",
            Self::Sa => "sa",
            Self::Lb => "lb",
            Self::My => "my",
            Self::Bo => "bo",
            Self::Tl => "tl",
            Self::Mg => "mg",
            Self::As => "as",
            Self::Tt => "tt",
            Self::Haw => "haw",
            Self::Ln => "ln",
            Self::Ha => "ha",
            Self::Ba => "ba",
            Self::Jw => "jw",
            Self::Su => "su",
            Self::Yue => "yue",
        }
    }
}

impl std::fmt::Display for Language {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.code())
    }
}

impl std::str::FromStr for Language {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        match s {
            "en" => Ok(Self::En),
            "zh" => Ok(Self::Zh),
            "de" => Ok(Self::De),
            "es" => Ok(Self::Es),
            "ru" => Ok(Self::Ru),
            "ko" => Ok(Self::Ko),
            "fr" => Ok(Self::Fr),
            "ja" => Ok(Self::Ja),
            "pt" => Ok(Self::Pt),
            "tr" => Ok(Self::Tr),
            "pl" => Ok(Self::Pl),
            "ca" => Ok(Self::Ca),
            "nl" => Ok(Self::Nl),
            "ar" => Ok(Self::Ar),
            "sv" => Ok(Self::Sv),
            "it" => Ok(Self::It),
            "id" => Ok(Self::Id),
            "hi" => Ok(Self::Hi),
            "fi" => Ok(Self::Fi),
            "vi" => Ok(Self::Vi),
            "he" => Ok(Self::He),
            "uk" => Ok(Self::Uk),
            "el" => Ok(Self::El),
            "ms" => Ok(Self::Ms),
            "cs" => Ok(Self::Cs),
            "ro" => Ok(Self::Ro),
            "da" => Ok(Self::Da),
            "hu" => Ok(Self::Hu),
            "ta" => Ok(Self::Ta),
            "no" => Ok(Self::No),
            "th" => Ok(Self::Th),
            "ur" => Ok(Self::Ur),
            "hr" => Ok(Self::Hr),
            "bg" => Ok(Self::Bg),
            "lt" => Ok(Self::Lt),
            "la" => Ok(Self::La),
            "mi" => Ok(Self::Mi),
            "ml" => Ok(Self::Ml),
            "cy" => Ok(Self::Cy),
            "sk" => Ok(Self::Sk),
            "te" => Ok(Self::Te),
            "fa" => Ok(Self::Fa),
            "lv" => Ok(Self::Lv),
            "bn" => Ok(Self::Bn),
            "sr" => Ok(Self::Sr),
            "az" => Ok(Self::Az),
            "sl" => Ok(Self::Sl),
            "kn" => Ok(Self::Kn),
            "et" => Ok(Self::Et),
            "mk" => Ok(Self::Mk),
            "br" => Ok(Self::Br),
            "eu" => Ok(Self::Eu),
            "is" => Ok(Self::Is),
            "hy" => Ok(Self::Hy),
            "ne" => Ok(Self::Ne),
            "mn" => Ok(Self::Mn),
            "bs" => Ok(Self::Bs),
            "kk" => Ok(Self::Kk),
            "sq" => Ok(Self::Sq),
            "sw" => Ok(Self::Sw),
            "gl" => Ok(Self::Gl),
            "mr" => Ok(Self::Mr),
            "pa" => Ok(Self::Pa),
            "si" => Ok(Self::Si),
            "km" => Ok(Self::Km),
            "sn" => Ok(Self::Sn),
            "yo" => Ok(Self::Yo),
            "so" => Ok(Self::So),
            "af" => Ok(Self::Af),
            "oc" => Ok(Self::Oc),
            "ka" => Ok(Self::Ka),
            "be" => Ok(Self::Be),
            "tg" => Ok(Self::Tg),
            "sd" => Ok(Self::Sd),
            "gu" => Ok(Self::Gu),
            "am" => Ok(Self::Am),
            "yi" => Ok(Self::Yi),
            "lo" => Ok(Self::Lo),
            "uz" => Ok(Self::Uz),
            "fo" => Ok(Self::Fo),
            "ht" => Ok(Self::Ht),
            "ps" => Ok(Self::Ps),
            "tk" => Ok(Self::Tk),
            "nn" => Ok(Self::Nn),
            "mt" => Ok(Self::Mt),
            "sa" => Ok(Self::Sa),
            "lb" => Ok(Self::Lb),
            "my" => Ok(Self::My),
            "bo" => Ok(Self::Bo),
            "tl" => Ok(Self::Tl),
            "mg" => Ok(Self::Mg),
            "as" => Ok(Self::As),
            "tt" => Ok(Self::Tt),
            "haw" => Ok(Self::Haw),
            "ln" => Ok(Self::Ln),
            "ha" => Ok(Self::Ha),
            "ba" => Ok(Self::Ba),
            "jw" => Ok(Self::Jw),
            "su" => Ok(Self::Su),
            "yue" => Ok(Self::Yue),
            other => Err(format!("unknown whisper language code: {other}")),
        }
    }
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct TranscribeOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<Language>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub initial_prompt: Option<String>,
}

fn build_whisper_prompt(options: &TranscribeOptions) -> String {
    let lang = options
        .language
        .as_ref()
        .map(Language::code)
        .unwrap_or("en");
    match &options.initial_prompt {
        Some(p) => format!(
            "<|startofprev|>{p}<|startoftranscript|><|{lang}|><|transcribe|><|notimestamps|>"
        ),
        None => format!("<|startoftranscript|><|{lang}|><|transcribe|><|notimestamps|>"),
    }
}

impl Model {
    pub fn transcribe_file(
        &self,
        audio_path: impl AsRef<Path>,
        options: &TranscribeOptions,
    ) -> Result<CactusResponse> {
        let path_c = CString::new(audio_path.as_ref().to_str().unwrap_or(""))?;
        let prompt = build_whisper_prompt(options);
        let prompt_c = CString::new(prompt)?;
        let options_c = CString::new(serde_json::to_string(options)?)?;

        let mut buf = vec![0u8; RESPONSE_BUF_SIZE];

        let rc = unsafe {
            cactus_sys::cactus_transcribe(
                self.raw_handle(),
                path_c.as_ptr(),
                prompt_c.as_ptr(),
                buf.as_mut_ptr() as *mut i8,
                buf.len(),
                options_c.as_ptr(),
                None,
                std::ptr::null_mut(),
                std::ptr::null(),
                0,
            )
        };

        if rc < 0 {
            return Err(Error::from_ffi_or(format!(
                "cactus_transcribe failed ({rc})"
            )));
        }

        parse_response_buf(&buf)
    }

    pub fn transcribe_pcm(
        &self,
        pcm: &[u8],
        options: &TranscribeOptions,
    ) -> Result<CactusResponse> {
        let prompt = build_whisper_prompt(options);
        let prompt_c = CString::new(prompt)?;
        let options_c = CString::new(serde_json::to_string(options)?)?;

        let mut buf = vec![0u8; RESPONSE_BUF_SIZE];

        let rc = unsafe {
            cactus_sys::cactus_transcribe(
                self.raw_handle(),
                std::ptr::null(),
                prompt_c.as_ptr(),
                buf.as_mut_ptr() as *mut i8,
                buf.len(),
                options_c.as_ptr(),
                None,
                std::ptr::null_mut(),
                pcm.as_ptr(),
                pcm.len(),
            )
        };

        if rc < 0 {
            return Err(Error::from_ffi_or(format!(
                "cactus_transcribe pcm failed ({rc})"
            )));
        }

        parse_response_buf(&buf)
    }
}

// -- Streaming transcriber --

pub struct Transcriber<'a> {
    handle: NonNull<std::ffi::c_void>,
    options_json: CString,
    _model: PhantomData<&'a Model>,
}

unsafe impl Send for Transcriber<'_> {}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StreamResult {
    #[serde(default)]
    pub confirmed: String,
    #[serde(default)]
    pub pending: String,
    #[serde(default)]
    pub language: Option<String>,
    #[serde(default)]
    pub confidence: f32,
}

impl<'a> Transcriber<'a> {
    pub fn new(model: &'a Model, options: &TranscribeOptions) -> Result<Self> {
        let options_c = CString::new(serde_json::to_string(options)?)?;

        let raw = unsafe { cactus_sys::cactus_stream_transcribe_init(model.raw_handle()) };

        let handle = NonNull::new(raw)
            .ok_or_else(|| Error::from_ffi_or("cactus_stream_transcribe_init returned null"))?;

        Ok(Self {
            handle,
            options_json: options_c,
            _model: PhantomData,
        })
    }

    pub fn process(&mut self, pcm: &[u8]) -> Result<StreamResult> {
        let mut buf = vec![0u8; RESPONSE_BUF_SIZE];

        let rc_insert = unsafe {
            cactus_sys::cactus_stream_transcribe_insert(
                self.handle.as_ptr(),
                pcm.as_ptr(),
                pcm.len(),
            )
        };

        if rc_insert < 0 {
            return Err(Error::from_ffi_or(format!(
                "cactus_stream_transcribe_insert failed ({rc_insert})"
            )));
        }

        let rc = unsafe {
            cactus_sys::cactus_stream_transcribe_process(
                self.handle.as_ptr(),
                buf.as_mut_ptr() as *mut i8,
                buf.len(),
                self.options_json.as_ptr(),
            )
        };

        if rc < 0 {
            return Err(Error::from_ffi_or(format!(
                "cactus_stream_transcribe_process failed ({rc})"
            )));
        }

        let raw = read_cstr_from_buf(&buf);
        Ok(serde_json::from_str(&raw).unwrap_or(StreamResult {
            confirmed: raw,
            pending: String::new(),
            language: None,
            confidence: 0.0,
        }))
    }

    pub fn process_samples(&mut self, samples: &[i16]) -> Result<StreamResult> {
        let bytes = unsafe {
            std::slice::from_raw_parts(
                samples.as_ptr() as *const u8,
                samples.len() * std::mem::size_of::<i16>(),
            )
        };
        self.process(bytes)
    }

    pub fn process_f32(&mut self, samples: &[f32]) -> Result<StreamResult> {
        let converted: Vec<i16> = samples
            .iter()
            .map(|&s| (s.clamp(-1.0, 1.0) * i16::MAX as f32) as i16)
            .collect();
        self.process_samples(&converted)
    }

    pub fn stop(self) -> Result<StreamResult> {
        let mut buf = vec![0u8; RESPONSE_BUF_SIZE];

        let rc = unsafe {
            cactus_sys::cactus_stream_transcribe_finalize(
                self.handle.as_ptr(),
                buf.as_mut_ptr() as *mut i8,
                buf.len(),
            )
        };

        unsafe {
            cactus_sys::cactus_stream_transcribe_destroy(self.handle.as_ptr());
        }

        std::mem::forget(self);

        if rc < 0 {
            return Err(Error::from_ffi_or(format!(
                "cactus_stream_transcribe_finalize failed ({rc})"
            )));
        }

        let raw = read_cstr_from_buf(&buf);
        Ok(serde_json::from_str(&raw).unwrap_or(StreamResult {
            confirmed: raw,
            pending: String::new(),
            language: None,
            confidence: 0.0,
        }))
    }
}

impl Drop for Transcriber<'_> {
    fn drop(&mut self) {
        unsafe {
            cactus_sys::cactus_stream_transcribe_destroy(self.handle.as_ptr());
        }
    }
}
