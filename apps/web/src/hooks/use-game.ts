"use client";

import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useGameStore } from "@/stores/game-store";

export function useGameSocket() {
  const initialized = useRef(false);
  const {
    setActiveGame,
    setPlayers,
    updatePlayer,
    removePlayer,
    updateGameState,
    finishGame,
    addChannelGame,
    setPendingOpenGameId,
  } = useGameStore();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const socket = getSocket();

    socket.on("game:created", ({ game, players }) => {
      addChannelGame(game.channelId, game);
      setPendingOpenGameId(game.id);
    });

    socket.on("game:player_joined", ({ gameId, player }) => {
      updatePlayer(player);
    });

    socket.on("game:player_left", ({ gameId, userId }) => {
      removePlayer(userId);
    });

    socket.on("game:started", ({ gameId, state, players }) => {
      updateGameState(state);
      setPlayers(players);
    });

    socket.on("game:state_update", ({ gameId, state, players }) => {
      updateGameState(state);
      setPlayers(players);
    });

    socket.on("game:finished", ({ gameId, finalState, players, winner }) => {
      finishGame(finalState);
      setPlayers(players);
    });

    socket.on("game:error", ({ gameId, message }) => {
      console.error(`[Game ${gameId}] Error: ${message}`);
    });

    return () => {
      socket.off("game:created");
      socket.off("game:player_joined");
      socket.off("game:player_left");
      socket.off("game:started");
      socket.off("game:state_update");
      socket.off("game:finished");
      socket.off("game:error");
      initialized.current = false;
    };
  }, [
    setActiveGame,
    setPlayers,
    updatePlayer,
    removePlayer,
    updateGameState,
    finishGame,
    addChannelGame,
    setPendingOpenGameId,
  ]);
}
