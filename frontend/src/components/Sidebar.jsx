import React from 'react';

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-primary-card border-r border-gray-800 p-6 flex flex-col space-y-4">
      <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Navigation</div>
      <div className="flex flex-col space-y-1">
        <span className="text-gray-300 hover:text-brand-blue cursor-pointer text-sm">Dashboard</span>
      </div>
    </aside>
  );
};

export default Sidebar;
