import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import { SOCKET_EVENTS } from '../../../shared/events';

export default function RoomList({ username, avatar, onJoinRoom }) {
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  useEffect(() => {
    socket.emit(SOCKET_EVENTS.GET_ROOMS);

    const handleRoomList = (list) => {
      setRooms(list);
    };

    socket.on(SOCKET_EVENTS.ROOM_LIST_UPDATED, handleRoomList);

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_LIST_UPDATED, handleRoomList);
    };
  }, []);

  const handleJoin = (roomId) => {
    socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, username, avatar }, (response) => {
      if (response && response.success) {
        onJoinRoom(roomId);
      } else {
        alert(response?.message || 'Could not join room');
      }
    });
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch = (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (r.code || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (filterCategory === 'CASUAL') return matchesSearch && r.roundTime >= 60;
    if (filterCategory === 'SPEED') return matchesSearch && r.roundTime < 60;
    return matchesSearch;
  });

  return (
    <div className="w-full flex flex-col gap-space-md mt-space-lg">
      <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-xs border-b-2 border-border-dark">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-primary text-[22px]">hub</span>
          <h3 className="font-headline-sm text-headline-sm uppercase text-border-dark">PUBLIC ROOM BROWSER</h3>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-space-xs flex-wrap">
          <button
            className={`font-label-sm text-label-sm px-space-md py-1 rounded-full border border-border-dark font-bold uppercase transition-all ${
              filterCategory === 'ALL' ? 'bg-secondary-fixed text-on-secondary-fixed shadow-sm' : 'bg-surface-card text-on-surface-variant'
            }`}
            onClick={() => setFilterCategory('ALL')}
            type="button"
          >
            ALL ROOMS
          </button>
          <button
            className={`font-label-sm text-label-sm px-space-md py-1 rounded-full border border-border-dark font-bold uppercase transition-all ${
              filterCategory === 'CASUAL' ? 'bg-secondary-fixed text-on-secondary-fixed shadow-sm' : 'bg-surface-card text-on-surface-variant'
            }`}
            onClick={() => setFilterCategory('CASUAL')}
            type="button"
          >
            CASUAL (60S)
          </button>
          <button
            className={`font-label-sm text-label-sm px-space-md py-1 rounded-full border border-border-dark font-bold uppercase transition-all ${
              filterCategory === 'SPEED' ? 'bg-secondary-fixed text-on-secondary-fixed shadow-sm' : 'bg-surface-card text-on-surface-variant'
            }`}
            onClick={() => setFilterCategory('SPEED')}
            type="button"
          >
            SPEED (30S)
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative w-full">
        <input
          type="text"
          placeholder="SEARCH BY ROOM NAME OR CODE..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-canvas-paper text-on-surface font-body-md text-body-md px-space-md py-space-xs pl-10 rounded-xl border-2 border-border-dark shadow-inner focus:outline-none focus:ring-2 focus:ring-secondary-container"
        />
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[20px]">
          search
        </span>
      </div>

      {/* Rooms Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {filteredRooms.length === 0 ? (
          <div className="col-span-full p-space-lg text-center font-body-md text-body-md text-on-surface-variant bg-canvas-paper rounded-xl border-2 border-border-dark">
            No active public rooms matched your filter. Create a room above!
          </div>
        ) : (
          filteredRooms.map((room) => (
            <div
              key={room.id}
              className="bg-canvas-paper p-space-md rounded-xl border-2 border-border-dark shadow-[3px_3px_0px_#18181B] flex flex-col justify-between gap-space-sm hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="font-label-sm text-[10px] uppercase text-primary font-bold tracking-wider">
                    {room.gameMode}
                  </span>
                  <h4 className="font-headline-sm text-headline-sm text-border-dark font-bold">{room.name}</h4>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Host: {room.host}</span>
                </div>
                <span className="bg-tertiary-fixed text-on-tertiary-fixed font-headline-sm text-label-sm px-2 py-0.5 rounded-full border border-border-dark font-black">
                  #{room.code || room.id}
                </span>
              </div>

              <div className="flex items-center justify-between pt-space-xs border-t border-border-dark/20 mt-space-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 font-bold">
                  <span className="material-symbols-outlined text-[16px]">group</span>
                  {room.playerCount} / {room.maxPlayers} PLAYERS
                </span>

                <button
                  className="px-space-md py-1 rounded-lg bg-primary-container text-on-primary font-headline-sm text-label-md uppercase border-2 border-border-dark shadow-[2px_2px_0px_#18181B] hover:opacity-90 disabled:opacity-50 transition-all"
                  onClick={() => handleJoin(room.id)}
                  disabled={room.playerCount >= room.maxPlayers}
                  type="button"
                >
                  {room.playerCount >= room.maxPlayers ? 'FULL' : 'JOIN MATCH'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
