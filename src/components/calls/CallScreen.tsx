import React, { useCallback, useMemo } from "react";
import { Track } from "livekit-client";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  TrackToggle,
  useTracks,
  useLocalParticipant,
  useConnectionState,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { PhoneOff } from "lucide-react";
import { useCallCountdown, formatDuration } from "../../hooks/useCallCountdown";
import type { CallCredentials } from "../../services/calling";

/**
 * The connected call, and THE ONLY MODULE IN THIS APP THAT IMPORTS LIVEKIT.
 *
 * THAT IS THE POINT OF THE FILE BOUNDARY, not an accident of organisation.
 * livekit-client plus @livekit/components-react measure +147 KB gzip — about a
 * third of this app's entire bundle — and a call is something most sessions
 * never place. Every import of them is confined here so that `React.lazy` in
 * CallSurface puts the whole lot in a separate chunk that is fetched the first
 * time a call actually connects, and never on the marketing pages, the food
 * diary or anywhere else. Adding a LiveKit import to any other file silently
 * undoes that; there is nothing in the build that will complain.
 *
 * NO ControlBar. It is a prefab, and LiveKit's own documentation says prefabs
 * are "not intended for extension" — it also ships its own stylesheet, which
 * would not match this app's tokens, and it has no room for the countdown that
 * has to sit beside the controls. The three controls here are built from
 * TrackToggle and a plain button instead.
 *
 * NO DisconnectButton EITHER, and that one is worth explaining: it disconnects
 * the LiveKit room, which is only half of hanging up. The call also has to be
 * ENDED — end-call writes the terminal status and the real duration_sec — and
 * the row is what the other participant is watching. Leaving the room silently
 * would drop the media and leave a row that says the call is still in progress
 * until the cap sweep closes it hours later. So hang-up calls onHangUp, and
 * unmounting this component is what disconnects the room.
 */

const VIDEO_SOURCES = [Track.Source.Camera] as const;

/** Below this many seconds remaining, the countdown becomes visible and urgent. */
const WARN_AT_SECONDS = 5 * 60;

interface Props {
  credentials: CallCredentials;
  /** The other person's display name, for the placeholder and the header. */
  participantName: string;
  /** Whether this side opened with video. A voice call never publishes camera. */
  video: boolean;
  startedAt: string | null;
  onHangUp: () => void;
}

/**
 * Everything inside the room context. Split out because the LiveKit hooks all
 * require a Room above them — calling `useTracks` beside `<LiveKitRoom>` rather
 * than inside it throws.
 */
const CallStage: React.FC<{
  participantName: string;
  video: boolean;
  startedAt: string | null;
  capSeconds: number;
  onHangUp: () => void;
}> = ({ participantName, video, startedAt, capSeconds, onHangUp }) => {
  const connection = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([...VIDEO_SOURCES], { onlySubscribed: false });

  const { secondsLeft, elapsedSeconds } = useCallCountdown(startedAt, capSeconds, onHangUp);

  // Split by ownership rather than by index: `tracks` contains both sides and
  // the order is not guaranteed.
  const { mine, theirs } = useMemo(() => {
    const localId = localParticipant?.identity;
    let mineRef = null as (typeof tracks)[number] | null;
    let theirsRef = null as (typeof tracks)[number] | null;
    for (const t of tracks) {
      if (t.participant.identity === localId) mineRef = t;
      else theirsRef = t;
    }
    return { mine: mineRef, theirs: theirsRef };
  }, [tracks, localParticipant?.identity]);

  const connected = connection === ConnectionState.Connected;
  const hasPublication = (t: typeof mine) => !!t && "publication" in t && !!t.publication;

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* The remote party fills the screen; the local preview is an inset. */}
      <div className="relative flex-1 bg-[#0D0B1A] overflow-hidden">
        {hasPublication(theirs) ? (
          <VideoTrack
            trackRef={theirs!}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-semibold text-white/80">
              {participantName.trim().charAt(0).toUpperCase() || "?"}
            </div>
            <p className="text-sm font-semibold text-white/85">{participantName}</p>
            <p className="text-xs text-white/55">
              {connected ? "Connected" : "Connecting…"}
            </p>
          </div>
        )}

        {video && hasPublication(mine) && (
          <div className="absolute top-4 right-4 w-24 sm:w-32 aspect-[3/4] rounded-2xl overflow-hidden ring-1 ring-white/20 shadow-lift">
            <VideoTrack trackRef={mine!} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Elapsed time, and the countdown once the cap is close. Both read
            from the same wall clock, so they cannot disagree. */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="text-xs font-semibold text-white/80 bg-black/35 rounded-full px-2.5 py-1 tabular-nums">
            {formatDuration(elapsedSeconds)}
          </span>
          {secondsLeft !== null && secondsLeft <= WARN_AT_SECONDS && (
            <span className="text-xs font-semibold text-white bg-status-high/90 rounded-full px-2.5 py-1 tabular-nums">
              {formatDuration(secondsLeft)} left
            </span>
          )}
        </div>
      </div>

      {/* Controls. Built from primitives so the countdown above can share the
          same visual language; see the header for why not ControlBar. */}
      <div className="shrink-0 bg-[#0D0B1A] px-6 pt-4 pb-8 flex items-center justify-center gap-4">
        <TrackToggle
          source={Track.Source.Microphone}
          className="tap w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center data-[lk-enabled=false]:bg-white/25"
        />
        {video && (
          <TrackToggle
            source={Track.Source.Camera}
            className="tap w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center data-[lk-enabled=false]:bg-white/25"
          />
        )}
        <button
          onClick={onHangUp}
          aria-label="End call"
          className="tap w-16 h-14 rounded-full bg-status-high text-white flex items-center justify-center"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
};

const CallScreen: React.FC<Props> = ({
  credentials,
  participantName,
  video,
  startedAt,
  onHangUp,
}) => {
  // Stable identity so LiveKitRoom does not tear down and rebuild the room on
  // an unrelated parent render.
  const handleDisconnected = useCallback(() => {
    // Fired when the SERVER ends the room — which is exactly what
    // enforce-call-caps does when a call outlives its cap. Treating it as a
    // hang-up keeps the local UI honest instead of showing a connected call
    // whose media is gone.
    onHangUp();
  }, [onHangUp]);

  return (
    <LiveKitRoom
      token={credentials.token}
      serverUrl={credentials.livekitUrl}
      connect={true}
      audio={true}
      video={video}
      onDisconnected={handleDisconnected}
      onError={(e) => console.error("[calling] LiveKit error:", e.message)}
      className="absolute inset-0"
    >
      {/* Remote audio has no visual component and is easy to forget; without
          this nothing is audible even though the track is subscribed. */}
      <RoomAudioRenderer />
      <CallStage
        participantName={participantName}
        video={video}
        startedAt={startedAt}
        capSeconds={credentials.capSeconds}
        onHangUp={onHangUp}
      />
    </LiveKitRoom>
  );
};

// Default export so React.lazy can load this module without a wrapper.
export default CallScreen;
