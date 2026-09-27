/**
 * @format
 */

import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import App from '../App';

describe('App', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders correctly after the splash transition', async () => {
    let renderer: ReactTestRenderer;

    await act(async () => {
      renderer = create(<App />);
    });

    await act(async () => {
      jest.advanceTimersByTime(2500);
    });

    expect(renderer!.toJSON()).toBeTruthy();

    act(() => {
      renderer!.unmount();
    });
  });
});
