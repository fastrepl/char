use std::panic::AssertUnwindSafe;

use objc2::{msg_send, rc::Retained};
use objc2_foundation::{NSInteger, NSPredicate};

use crate::types::{ParticipantContact, ParticipantScheduleStatus};

pub fn resolve_participant_contact(
    participant: &objc2_event_kit::EKParticipant,
    url: Option<&str>,
    name: Option<&str>,
) -> (Option<String>, Option<ParticipantContact>) {
    if let Some(contact) = try_fetch_contact(participant) {
        let email = contact.email_addresses.first().cloned();
        if email.is_some() {
            return (email, Some(contact));
        }
        let email = parse_email_from_url(url).or_else(|| parse_email_from_name(name));
        return (email, Some(contact));
    }

    let email = parse_email_from_url(url).or_else(|| parse_email_from_name(name));
    (email, None)
}

fn try_fetch_contact(participant: &objc2_event_kit::EKParticipant) -> Option<ParticipantContact> {
    let participant = AssertUnwindSafe(participant);
    let predicate: Retained<NSPredicate> =
        match unsafe { objc2::exception::catch(|| participant.contactPredicate()) } {
            Ok(p) => p,
            Err(_) => return None,
        };

    tauri_plugin_apple_contact::fetch_contact_with_predicate(&predicate)
}

fn parse_email_from_url(url: Option<&str>) -> Option<String> {
    let url = url?;
    let lower = url.to_lowercase();
    if lower.starts_with("mailto:") {
        let email = url[7..].to_string();
        if !email.is_empty() {
            return Some(email);
        }
    }
    None
}

fn parse_email_from_name(name: Option<&str>) -> Option<String> {
    let name = name?.trim();
    if name.contains('@') && name.contains('.') && !name.contains(' ') {
        Some(name.to_string())
    } else {
        None
    }
}

pub fn safe_participant_schedule_status(
    participant: &objc2_event_kit::EKParticipant,
) -> Option<ParticipantScheduleStatus> {
    let participant = AssertUnwindSafe(participant);
    let result = objc2::exception::catch(|| unsafe {
        let raw: NSInteger = msg_send![*participant, participantScheduleStatus];
        raw
    });

    match result {
        Ok(raw) => transform_participant_schedule_status(raw),
        Err(_) => None,
    }
}

fn transform_participant_schedule_status(status: NSInteger) -> Option<ParticipantScheduleStatus> {
    match status {
        0 => Some(ParticipantScheduleStatus::None),
        1 => Some(ParticipantScheduleStatus::Pending),
        2 => Some(ParticipantScheduleStatus::Sent),
        3 => Some(ParticipantScheduleStatus::Delivered),
        4 => Some(ParticipantScheduleStatus::RecipientNotRecognized),
        5 => Some(ParticipantScheduleStatus::NoPrivileges),
        6 => Some(ParticipantScheduleStatus::DeliveryFailed),
        7 => Some(ParticipantScheduleStatus::CannotDeliver),
        _ => None,
    }
}
