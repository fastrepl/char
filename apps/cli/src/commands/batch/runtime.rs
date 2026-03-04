use hypr_listener2_core::{BatchEvent, BatchRuntime};

pub(super) struct CliBatchRuntime;

impl BatchRuntime for CliBatchRuntime {
    fn emit(&self, event: BatchEvent) {
        match &event {
            BatchEvent::BatchStarted { .. } => {
                eprintln!("Transcribing...");
            }
            BatchEvent::BatchResponseStreamed { percentage, .. } => {
                eprintln!("Progress: {:.0}%", percentage * 100.0);
            }
            BatchEvent::BatchResponse { response, .. } => {
                for channel in &response.results.channels {
                    for alt in &channel.alternatives {
                        if !alt.transcript.is_empty() {
                            println!("{}", alt.transcript);
                        }
                    }
                }
            }
            BatchEvent::BatchFailed { error, .. } => {
                eprintln!("Error: {error}");
            }
        }
    }
}
