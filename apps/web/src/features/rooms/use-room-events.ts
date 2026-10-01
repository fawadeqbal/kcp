'use client';

import type { components } from '@kcp/api-client-ts';
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL, freshAccessToken } from '@/lib/api';

type Message = components['schemas']['ChatMessageDto'];

export interface RoomEvents {
  onMessage?: (message: Message) => void;
  onHidden?: (event: { roomId: string; messageId: string }) => void;
  /** Connected again after a break: reload what may have been missed. */
  onReconnect?: () => void;
}

/**
 * Live messages for the rooms the signed-in member is in (members only: parents read
 * their children's rooms without it). Connects once per page; reconnects with a
 * fresh token.
 */
export function useRoomEvents(enabled: boolean, events: RoomEvents) {
  const handlers = useRef(events);
  handlers.current = events;

  useEffect(() => {
    if (!enabled) return;
    let socket: Socket | null = io(`${API_URL}/chat`, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: (send) => {
        void freshAccessToken().then((token) => send({ token }));
      },
      reconnectionDelay: 2_000,
      reconnectionDelayMax: 30_000,
    });
    let connectedBefore = false;
    socket.on('ready', () => {
      if (connectedBefore) handlers.current.onReconnect?.();
      connectedBefore = true;
    });
    socket.on('message', (message: Message) => handlers.current.onMessage?.(message));
    socket.on('hidden', (event: { roomId: string; messageId: string }) =>
      handlers.current.onHidden?.(event),
    );
    // Refused (signed out elsewhere, or the session ended): try again later with a
    // new token; the page still works without live updates.
    socket.on('refused', () => undefined);
    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [enabled]);
}
