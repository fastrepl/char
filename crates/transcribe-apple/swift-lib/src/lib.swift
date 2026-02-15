import SwiftRs
import Foundation
import Speech
import AVFoundation

private struct TranscriptionResult {
    var text: String
    var isFinal: Bool
    var words: [(String, Double, Double, Float)]
}

private class RecognitionSession {
    let recognizer: SFSpeechRecognizer
    let request: SFSpeechAudioBufferRecognitionRequest
    var task: SFSpeechRecognitionTask?
    var latestResult: TranscriptionResult?
    var error: String?
    var isFinished: Bool = false

    let lock = NSLock()
    let format: AVAudioFormat

    init(locale: String, sampleRate: Double) {
        let loc = Locale(identifier: locale)
        self.recognizer = SFSpeechRecognizer(locale: loc) ?? SFSpeechRecognizer()!
        self.request = SFSpeechAudioBufferRecognitionRequest()
        self.request.shouldReportPartialResults = true
        self.request.requiresOnDeviceRecognition = true
        self.format = AVAudioFormat(
            standardFormatWithSampleRate: sampleRate,
            channels: 1
        )!
    }

    func start() {
        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self = self else { return }
            self.lock.lock()
            defer { self.lock.unlock() }

            if let result = result {
                let segments = result.bestTranscription.segments
                var words: [(String, Double, Double, Float)] = []
                for segment in segments {
                    let start = segment.timestamp
                    let end = segment.timestamp + segment.duration
                    let confidence = segment.confidence
                    words.append((segment.substring, start, end, confidence))
                }

                self.latestResult = TranscriptionResult(
                    text: result.bestTranscription.formattedString,
                    isFinal: result.isFinal,
                    words: words
                )
            }

            if let error = error {
                self.error = error.localizedDescription
            }

            if result?.isFinal == true || error != nil {
                self.isFinished = true
            }
        }
    }

    func appendAudio(samples: UnsafePointer<Float>, count: Int) {
        guard let buffer = AVAudioPCMBuffer(
            pcmFormat: format,
            frameCapacity: AVAudioFrameCount(count)
        ) else { return }

        buffer.frameLength = AVAudioFrameCount(count)
        if let channelData = buffer.floatChannelData {
            channelData[0].update(from: samples, count: count)
        }
        request.append(buffer)
    }

    func endAudio() {
        request.endAudio()
    }

    func cancel() {
        task?.cancel()
        isFinished = true
    }

    func takeResult() -> TranscriptionResult? {
        lock.lock()
        defer { lock.unlock() }
        let result = latestResult
        latestResult = nil
        return result
    }
}

private var sessions: [UInt64: RecognitionSession] = [:]
private var sessionsLock = NSLock()
private var nextSessionId: UInt64 = 1

@_cdecl("_apple_stt_is_available")
public func _apple_stt_is_available() -> Bool {
    guard let recognizer = SFSpeechRecognizer() else { return false }
    return recognizer.isAvailable
}

@_cdecl("_apple_stt_supports_on_device")
public func _apple_stt_supports_on_device() -> Bool {
    guard let recognizer = SFSpeechRecognizer() else { return false }
    return recognizer.supportsOnDeviceRecognition
}

@_cdecl("_apple_stt_create_session")
public func _apple_stt_create_session(locale: SRString, sampleRate: Double) -> UInt64 {
    sessionsLock.lock()
    defer { sessionsLock.unlock() }

    let id = nextSessionId
    nextSessionId += 1

    let session = RecognitionSession(
        locale: String(describing: locale),
        sampleRate: sampleRate
    )
    session.start()
    sessions[id] = session
    return id
}

@_cdecl("_apple_stt_append_audio")
public func _apple_stt_append_audio(
    sessionId: UInt64,
    samples: UnsafePointer<Float>,
    count: Int
) {
    sessionsLock.lock()
    let session = sessions[sessionId]
    sessionsLock.unlock()

    session?.appendAudio(samples: samples, count: count)
}

@_cdecl("_apple_stt_end_audio")
public func _apple_stt_end_audio(sessionId: UInt64) {
    sessionsLock.lock()
    let session = sessions[sessionId]
    sessionsLock.unlock()

    session?.endAudio()
}

@_cdecl("_apple_stt_poll_result")
public func _apple_stt_poll_result(sessionId: UInt64) -> SRString? {
    sessionsLock.lock()
    let session = sessions[sessionId]
    sessionsLock.unlock()

    guard let session = session,
          let result = session.takeResult() else {
        return nil
    }

    var wordsJson: [[String: Any]] = []
    for (text, start, end, confidence) in result.words {
        wordsJson.append([
            "word": text,
            "start": start,
            "end": end,
            "confidence": confidence
        ])
    }

    let json: [String: Any] = [
        "text": result.text,
        "is_final": result.isFinal,
        "words": wordsJson
    ]

    guard let data = try? JSONSerialization.data(withJSONObject: json),
          let str = String(data: data, encoding: .utf8) else {
        return nil
    }

    return SRString(str)
}

@_cdecl("_apple_stt_is_finished")
public func _apple_stt_is_finished(sessionId: UInt64) -> Bool {
    sessionsLock.lock()
    let session = sessions[sessionId]
    sessionsLock.unlock()

    return session?.isFinished ?? true
}

@_cdecl("_apple_stt_get_error")
public func _apple_stt_get_error(sessionId: UInt64) -> SRString? {
    sessionsLock.lock()
    let session = sessions[sessionId]
    sessionsLock.unlock()

    guard let error = session?.error else { return nil }
    return SRString(error)
}

@_cdecl("_apple_stt_destroy_session")
public func _apple_stt_destroy_session(sessionId: UInt64) {
    sessionsLock.lock()
    if let session = sessions.removeValue(forKey: sessionId) {
        session.cancel()
    }
    sessionsLock.unlock()
}
