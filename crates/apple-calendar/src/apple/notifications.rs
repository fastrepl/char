use std::sync::Arc;

use block2::RcBlock;
use objc2::{msg_send, rc::Retained};
use objc2_event_kit::EKEventStore;
use objc2_foundation::{NSNotification, NSNotificationCenter, NSObject, NSString};

struct NotificationObserver {
    #[allow(dead_code)]
    event_store: Retained<EKEventStore>,
    #[allow(dead_code)]
    observer: Retained<NSObject>,
    #[allow(dead_code)]
    block: RcBlock<dyn Fn(*const NSNotification)>,
}

pub fn setup_change_notification<F>(on_change: F)
where
    F: Fn() + Send + Sync + 'static,
{
    std::thread::spawn(move || {
        let event_store = unsafe { EKEventStore::new() };

        let on_change = Arc::new(on_change);
        let block = RcBlock::new(move |_notification: *const NSNotification| {
            on_change();
        });

        let observer = unsafe {
            let center = NSNotificationCenter::defaultCenter();
            let notification_name = NSString::from_str("EKEventStoreChangedNotification");

            let observer: Retained<NSObject> = msg_send![
                &*center,
                addObserverForName: &*notification_name,
                object: &*event_store,
                queue: std::ptr::null::<NSObject>(),
                usingBlock: &*block
            ];

            observer
        };

        let _observer = NotificationObserver {
            event_store,
            observer,
            block,
        };

        loop {
            std::thread::park();
        }
    });
}
