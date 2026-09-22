import React, { createContext, useContext, useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';

const SignalRContext = createContext();

export const useSignalR = () => useContext(SignalRContext);

export const SignalRProvider = ({ children }) => {
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const hubUrl = import.meta.env.DEV
      ? 'http://localhost:5067/notificationHub'
      : 'https://menugobe.onrender.com/notificationHub';

    const connect = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    connect
      .start()
      .then(() => {
        if (isMounted) {
          console.log('Connected to SignalR Hub');
          setConnection(connect);
        } else {
          connect.stop();
        }
      })
      .catch((err) => {
        // Suppress unmount negotiation abort warnings
        if (err.name !== 'AbortError' && !err.message?.includes('stopped during negotiation')) {
          console.warn('SignalR Connection Error:', err.message || err);
        }
      });

    return () => {
      isMounted = false;
      if (connect.state === signalR.HubConnectionState.Connected) {
        connect.stop();
      }
    };
  }, []);

  return (
    <SignalRContext.Provider value={connection}>
      {children}
    </SignalRContext.Provider>
  );
};
