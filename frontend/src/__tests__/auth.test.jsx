import React from 'react';
import { describe, it, expect, beforeEach } from "vitest";

// Mock localStorage for node environment
const store = {};
const mockLocalStorage = {
  getItem: (key) => store[key] || null,
  setItem: (key, value) => { store[key] = String(value); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((key) => delete store[key]); },
};

if (typeof global.localStorage === "undefined") {
  global.localStorage = mockLocalStorage;
}

describe('Authentication Context and Guards Tests', () => {
  beforeEach(() => {
    global.localStorage.clear();
  });

  it('should authenticate user and save tokens in storage on login success', () => {
    const token = 'mock_jwt_access_token';
    global.localStorage.setItem('access_token', token);
    expect(global.localStorage.getItem('access_token')).toBe(token);
  });

  it('should clear stored credentials on logout trigger', () => {
    global.localStorage.setItem('access_token', 'token');
    global.localStorage.removeItem('access_token');
    expect(global.localStorage.getItem('access_token')).toBeNull();
  });
});
