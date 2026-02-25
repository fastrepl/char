import Foundation
import SwiftRs

#if canImport(Speech)
  import Speech
  import AVFoundation
#endif

// MARK: - Result structure passed back to Rust via JSON

private struct TranscriptionResultJSON: Codable {
  let text: String
  let isFinal: Bool
  let startTime: Double
  let duration: Double
  let language: String?

  enum CodingKeys: String, CodingKey {
    case text
    case isFinal = "is_final"
    case startTime = "start_time"
    case duration
    case language
  }
}

// MARK: - Session handle

#if canImport(Speech)
  @available(macOS 26.0, *)
  private final class SpeechAnalyzerSession: @unchecked Sendable {
    let analyzer: SpeechAnalyzer
    let transcriber: SpeechTranscriber
    let inputContinuation: AsyncStream<AnalyzerInput>.Continuation
    let audioFormat: AVAudioFormat
    let sampleRate: Double
    let locale: Locale

    private let resultsLock = NSLock()
    private var pendingResults: [TranscriptionResultJSON] = []
    private var resultTask: Task<Void, Never>?
    private var analyzeTask: Task<Void, Never>?
    private var audioTimeOffset: Double = 0.0
    private var isFinished: Bool = false

    init(
      analyzer: SpeechAnalyzer,
      transcriber: SpeechTranscriber,
      inputContinuation: AsyncStream<AnalyzerInput>.Continuation,
      audioFormat: AVAudioFormat,
      sampleRate: Double,
      locale: Locale
    ) {
      self.analyzer = analyzer
      self.transcriber = transcriber
      self.inputContinuation = inputContinuation
      self.audioFormat = audioFormat
      self.sampleRate = sampleRate
      self.locale = locale
    }

    func startResultCollection() {
      resultTask = Task { [weak self] in
        guard let self = self else { return }
        do {
          for try await result in self.transcriber.results {
            let text = String(result.text.characters)
            if text.isEmpty { continue }

            let isFinal = result.isFinal

            let startTime = result.timeRange.lowerBound.seconds
            let endTime = result.timeRange.upperBound.seconds
            let duration = endTime - startTime

            let entry = TranscriptionResultJSON(
              text: text,
              isFinal: isFinal,
              startTime: startTime,
              duration: duration,
              language: self.locale.language.languageCode?.identifier
            )

            self.resultsLock.lock()
            self.pendingResults.append(entry)
            self.resultsLock.unlock()
          }
        } catch {
          // Analysis ended or error occurred
        }
      }
    }

    func startAnalysis(inputSequence: AsyncStream<AnalyzerInput>) {
      analyzeTask = Task { [weak self] in
        guard let self = self else { return }
        do {
          let _ = try await self.analyzer.analyzeSequence(inputSequence)
        } catch {
          // Analysis ended
        }
      }
    }

    func feedAudio(samples: UnsafePointer<Float>, count: Int) {
      guard !isFinished else { return }

      guard let pcmBuffer = AVAudioPCMBuffer(
        pcmFormat: audioFormat,
        frameCapacity: AVAudioFrameCount(count)
      ) else { return }

      pcmBuffer.frameLength = AVAudioFrameCount(count)

      if let channelData = pcmBuffer.floatChannelData {
        memcpy(channelData[0], samples, count * MemoryLayout<Float>.size)
      }

      let input = AnalyzerInput(buffer: pcmBuffer)
      inputContinuation.yield(input)

      audioTimeOffset += Double(count) / sampleRate
    }

    func drainResults() -> [TranscriptionResultJSON] {
      resultsLock.lock()
      let results = pendingResults
      pendingResults.removeAll()
      resultsLock.unlock()
      return results
    }

    func finish() {
      guard !isFinished else { return }
      isFinished = true
      inputContinuation.finish()

      Task {
        do {
          try await analyzer.finalizeAndFinishThroughEndOfInput()
        } catch {
          // Ignore
        }
      }
    }

    func cancel() {
      guard !isFinished else { return }
      isFinished = true
      inputContinuation.finish()
      resultTask?.cancel()
      analyzeTask?.cancel()
    }
  }
#endif

// MARK: - Handle storage

private var nextHandle: Int64 = 1
private let handleLock = NSLock()
private var sessions: [Int64: Any] = [:]

private func storeSession(_ session: Any) -> Int64 {
  handleLock.lock()
  let handle = nextHandle
  nextHandle += 1
  sessions[handle] = session
  handleLock.unlock()
  return handle
}

private func removeSession(_ handle: Int64) -> Any? {
  handleLock.lock()
  let session = sessions.removeValue(forKey: handle)
  handleLock.unlock()
  return session
}

#if canImport(Speech)
  @available(macOS 26.0, *)
  private func getSession(_ handle: Int64) -> SpeechAnalyzerSession? {
    handleLock.lock()
    let session = sessions[handle] as? SpeechAnalyzerSession
    handleLock.unlock()
    return session
  }
#endif

// MARK: - C-callable functions

@_cdecl("_speech_analyzer_is_available")
public func _speech_analyzer_is_available() -> Bool {
  #if canImport(Speech)
    if #available(macOS 26.0, *) {
      return true
    }
  #endif
  return false
}

@_cdecl("_speech_analyzer_supported_locales")
public func _speech_analyzer_supported_locales() -> SRString {
  #if canImport(Speech)
    if #available(macOS 26.0, *) {
      let locales = SpeechTranscriber.supportedLocales
      let ids = locales.map { $0.identifier }
      let json = (try? JSONSerialization.data(withJSONObject: ids)) ?? Data()
      return SRString(String(data: json, encoding: .utf8) ?? "[]")
    }
  #endif
  return SRString("[]")
}

@_cdecl("_speech_analyzer_create")
public func _speech_analyzer_create(localeId: SRString, sampleRate: Int) -> Int64 {
  #if canImport(Speech)
    if #available(macOS 26.0, *) {
      let localeStr = String(describing: localeId)
      let requestedLocale = Locale(identifier: localeStr)

      guard let locale = SpeechTranscriber.supportedLocale(equivalentTo: requestedLocale) else {
        return -1
      }

      let transcriber = SpeechTranscriber(locale: locale, preset: .default)

      let (inputSequence, inputContinuation) = AsyncStream.makeStream(of: AnalyzerInput.self)

      let analyzer = SpeechAnalyzer(modules: [transcriber])

      guard let audioFormat = AVAudioFormat(
        commonFormat: .pcmFormatFloat32,
        sampleRate: Double(sampleRate),
        channels: 1,
        interleaved: false
      ) else {
        return -2
      }

      let session = SpeechAnalyzerSession(
        analyzer: analyzer,
        transcriber: transcriber,
        inputContinuation: inputContinuation,
        audioFormat: audioFormat,
        sampleRate: Double(sampleRate),
        locale: locale
      )

      session.startResultCollection()
      session.startAnalysis(inputSequence: inputSequence)

      return storeSession(session)
    }
  #endif
  return -3
}

@_cdecl("_speech_analyzer_feed_audio")
public func _speech_analyzer_feed_audio(
  handle: Int64,
  samples: UnsafePointer<Float>,
  count: Int
) -> Bool {
  #if canImport(Speech)
    if #available(macOS 26.0, *) {
      guard let session = getSession(handle) else { return false }
      session.feedAudio(samples: samples, count: count)
      return true
    }
  #endif
  return false
}

@_cdecl("_speech_analyzer_get_results")
public func _speech_analyzer_get_results(handle: Int64) -> SRString {
  #if canImport(Speech)
    if #available(macOS 26.0, *) {
      guard let session = getSession(handle) else {
        return SRString("[]")
      }
      let results = session.drainResults()
      let encoder = JSONEncoder()
      let data = (try? encoder.encode(results)) ?? Data()
      return SRString(String(data: data, encoding: .utf8) ?? "[]")
    }
  #endif
  return SRString("[]")
}

@_cdecl("_speech_analyzer_finish")
public func _speech_analyzer_finish(handle: Int64) {
  #if canImport(Speech)
    if #available(macOS 26.0, *) {
      guard let session = getSession(handle) else { return }
      session.finish()
    }
  #endif
}

@_cdecl("_speech_analyzer_destroy")
public func _speech_analyzer_destroy(handle: Int64) {
  #if canImport(Speech)
    if #available(macOS 26.0, *) {
      if let session = removeSession(handle) as? SpeechAnalyzerSession {
        session.cancel()
      }
    }
  #endif
}
