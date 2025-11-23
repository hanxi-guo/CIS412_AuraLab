import React, { useState } from 'react';
import { Search, Plus, MoreHorizontal } from 'lucide-react';
import type { Campaign } from '../types';
import { MAX_CAMPAIGN_NAME_LENGTH, THEME } from '../config';

interface SidebarProps {
  campaigns: Campaign[];
  filteredCampaigns: Campaign[];
  selectedCampaignId: string;
  onSelectCampaign: (id: string) => void;
  onNewCampaign: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onDeleteCampaign: (id: string) => void;
  onRenameCampaign: (id: string, newName: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  campaigns,
  filteredCampaigns,
  selectedCampaignId,
  onSelectCampaign,
  onNewCampaign,
  searchTerm,
  onSearchChange,
  onDeleteCampaign,
  onRenameCampaign,
}) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const showEmptyState = filteredCampaigns.length === 0 && campaigns.length > 0;

  const handleSearchChange = (value: string) => {
    setMenuOpenId(null);
    setRenamingId(null);
    setRenameValue('');
    onSearchChange(value);
  };

  const startRename = (campaign: Campaign) => {
    setRenamingId(campaign.id);
    setRenameValue(campaign.name);
    setMenuOpenId(null);
  };

  const commitRename = (campaignId: string) => {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed) {
      setRenameValue('');
      return;
    }
    if (trimmed.length > MAX_CAMPAIGN_NAME_LENGTH) {
      alert(`Campaign name is limited to ${MAX_CAMPAIGN_NAME_LENGTH} characters.`);
    }
    const safe = trimmed.slice(0, MAX_CAMPAIGN_NAME_LENGTH);
    onRenameCampaign(campaignId, safe);
  };

  return (
    <div className={`w-64 h-screen flex-shrink-0 ${THEME.sidebar} flex flex-col p-6 font-sans`}>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input 
          type="text" 
          placeholder="Search campaigns" 
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-full bg-[#EDEAE3] border border-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#C27A70] text-sm placeholder-gray-500 transition-all"
        />
      </div>

      {/* New Campaign Button */}
      <button 
        onClick={onNewCampaign}
        className={`${THEME.accent} ${THEME.accentHover} text-white rounded-xl py-3 px-4 flex items-center justify-between shadow-sm mb-4 transition-colors`}
      >
        <span className="font-medium">New Campaign</span>
        <Plus className="w-5 h-5" />
      </button>

      {/* Campaign List (scrollable) */}
      <nav className="mt-2 flex-1 overflow-y-auto space-y-2 pr-1">
        {showEmptyState && (
          <div className="text-xs text-[#8C857B] italic px-1">
            No campaigns match “{searchTerm}”.
          </div>
        )}

        {filteredCampaigns.map((campaign) => {
          const isActive = campaign.id === selectedCampaignId;

          return (
            <div
              key={campaign.id}
              className={`relative w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl shadow-sm ${
                isActive
                  ? 'bg-[#F4F1EA] text-[#4A4238] font-medium'
                  : 'text-[#6B6359] hover:bg-[#E6E2D8]'
              }`}
            >
              {/* Name / Rename */}
              {renamingId === campaign.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length > MAX_CAMPAIGN_NAME_LENGTH) {
                      alert(
                        `Campaign name cannot exceed ${MAX_CAMPAIGN_NAME_LENGTH} characters.`
                      );
                    }
                    setRenameValue(value.slice(0, MAX_CAMPAIGN_NAME_LENGTH));
                  }}
                  onBlur={() => commitRename(campaign.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitRename(campaign.id);
                    } else if (e.key === 'Escape') {
                      setRenamingId(null);
                      setRenameValue('');
                    }
                  }}
                  className="flex-1 bg-white/80 border border-[#D1CBC1] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#C27A70]"
                />
              ) : (
                <button
                  onClick={() => onSelectCampaign(campaign.id)}
                  className="flex-1 text-left px-1 py-1 rounded-lg focus:outline-none truncate leading-[1.2]"
                  title={campaign.name}
                >
                  {campaign.name}
                </button>
              )}

              {/* Options menu trigger */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId((prev) => (prev === campaign.id ? null : campaign.id));
                }}
                className="p-1 rounded-full hover:bg-black/5 text-[#8C857B]"
                aria-label={`Options for ${campaign.name}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {/* Options menu */}
              {menuOpenId === campaign.id && (
                <div className="absolute right-2 top-10 z-30 bg-white rounded-xl shadow-lg border border-[#E6E2D8] text-xs py-1">
                  <button
                    type="button"
                    className="block w-full text-left px-4 py-2 hover:bg-[#F4F1EA]"
                    onClick={() => startRename(campaign)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="block w-full text-left px-4 py-2 hover:bg-[#F4F1EA] text-red-600"
                    onClick={() => {
                      setMenuOpenId(null);
                      onDeleteCampaign(campaign.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          );          
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
