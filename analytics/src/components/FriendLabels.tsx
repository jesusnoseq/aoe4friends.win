import React, { useState } from 'react';
import { hashNick } from '../services/nickHash';

interface Props {
  friends: string[];
  onChange: (friends: string[]) => void;
}

const FriendLabels: React.FC<Props> = ({ friends, onChange }) => {
  const [input, setInput] = useState('');
  const [hashes, setHashes] = useState<Record<string, string>>({});

  const addFriend = async () => {
    const name = input.trim();
    if (!name || friends.includes(name)) return;
    onChange([...friends, name]);
    setInput('');
    setHashes((prev) => ({ ...prev, [name]: '…' }));
    const hash = await hashNick(name);
    setHashes((prev) => ({ ...prev, [name]: hash }));
  };

  const removeFriend = (name: string) => {
    onChange(friends.filter((f) => f !== name));
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h2 className="text-white font-semibold mb-3">Friend labels</h2>
      <p className="text-gray-400 text-sm mb-3">
        Add nicknames to label matching nick hashes below. Hashes are computed
        locally and never leave your browser.
      </p>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void addFriend();
          }}
          placeholder="Nickname"
          className="flex-1 bg-gray-900 text-white text-sm rounded-md px-3 py-1.5 border border-gray-700 focus:outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={() => void addFriend()}
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-blue-500 text-white hover:bg-blue-400"
        >
          Add
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {friends.map((name) => (
          <li
            key={name}
            className="flex items-center gap-2 bg-gray-900 rounded-full px-3 py-1 text-sm text-gray-200 border border-gray-700"
          >
            <span>{name}</span>
            <code className="text-gray-500 text-xs">{hashes[name] ?? '…'}</code>
            <button
              type="button"
              onClick={() => removeFriend(name)}
              aria-label={`Remove ${name}`}
              className="text-gray-500 hover:text-red-400"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FriendLabels;
