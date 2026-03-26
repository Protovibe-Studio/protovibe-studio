import React from 'react';

export function InspectorStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      .dpad-btn { background: #2a2a2a; border: 1px solid #3c3c3c; color: #aaa; width: 18px; height: 18px; border-radius: 3px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.1s; padding: 0; outline: none; }
      .dpad-btn:hover:not(:disabled) { background: #3a3a3a; color: #fff; border-color: #555; }
      .dpad-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      
      .pv-tabs-container::-webkit-scrollbar { height: 4px; }
      .pv-tabs-container::-webkit-scrollbar-thumb { background: #555; border-radius: 4px; }
      .pv-box-container { padding: 16px 0; border-bottom: 1px solid #444; }
      
      /* Webflow Spacing Box Styles */
      .pv-margin-box { border-style: solid; border-width: 24px 36px; border-color: #383838 #2d2d2d #383838 #2d2d2d; position: relative; border-radius: 4px; display: flex; margin: 0 16px; margin-top: 12px; }
      .pv-padding-box { flex: 1; border-style: solid; border-width: 24px 36px; border-color: #444 #3a3a3a #444 #3a3a3a; position: relative; display: flex; }
      .pv-content-box { flex: 1; background: #222; min-height: 16px; min-width: 32px; border: 1px solid #555; }
      .pv-label { position: absolute; top: -18px; left: -28px; font-size: 8px; letter-spacing: 0.5px; color: #888; }
      
      .pv-input { position: absolute; background: transparent; border: 1px solid transparent; color: #18a0fb; font-weight: bold; font-size: 10px; text-align: center; width: 34px; height: 16px; outline: none; border-radius: 2px; }
      .pv-input::placeholder { color: #888; font-weight: normal; }
      .pv-input:hover { border-color: #555; }
      .pv-input:focus { background: #1e1e1e; border-color: #18a0fb; color: #fff !important; }
      
      .pv-top { top: -18px; left: 50%; transform: translateX(-50%); }
      .pv-bottom { bottom: -18px; left: 50%; transform: translateX(-50%); }
      .pv-left { left: -34px; top: 50%; transform: translateY(-50%); }
      .pv-right { right: -34px; top: 50%; transform: translateY(-50%); }
      
      .pv-input-full { background: #1e1e1e; border: 1px solid #3c3c3c; color: #18a0fb; font-weight: 600; font-size: 11px; padding: 4px 6px; outline: none; border-radius: 4px; width: 100%; transition: border-color 0.2s, color 0.2s; }
      .pv-input-full::placeholder { color: #888; font-weight: normal; }
      .pv-input-full:focus { border-color: #18a0fb; color: #fff !important; }
      
      .pv-select { background: #1e1e1e; border: 1px solid #3c3c3c; color: #d4d4d4; font-size: 11px; padding: 3px 4px; outline: none; border-radius: 4px; width: 100%; transition: border-color 0.2s; }
      .pv-select:focus { border-color: #18a0fb; color: #fff !important; }
      
      .pv-segment-group { display: flex; background: #1e1e1e; border: 1px solid #3c3c3c; border-radius: 4px; overflow: hidden; height: 24px;}
      .pv-segment-btn { flex: 1; background: transparent; border: none; border-right: 1px solid #3c3c3c; color: #888; display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; transition: all 0.2s; }
      .pv-segment-btn:last-child { border-right: none; }
      .pv-segment-btn:hover { background: #2a2a2a; color: #ccc; }
      .pv-segment-btn.active { background: #2c3a4a; color: #18a0fb; font-weight: bold; }
      
      /* Dropdown Styles */
      .pv-dropdown-container { position: absolute; width: max-content; min-width: 110px; max-height: 280px; overflow-y: auto; background: #2a2a2a; border: 1px solid #444; border-radius: 6px; z-index: 9999999; box-shadow: 0 8px 16px rgba(0,0,0,0.6); display: flex; flex-direction: column; padding: 0; }
      .pv-dropdown-item { padding: 6px 10px; font-size: 11px; color: #d4d4d4; cursor: pointer; font-family: monospace; transition: background 0.1s; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #383838; }
      .pv-dropdown-item:last-child { border-bottom: none; }
      .pv-dropdown-item:hover { background: #18a0fb; color: #fff; }
      .pv-dropdown-item:hover span { color: #fff !important; }
    `}} />
  );
}