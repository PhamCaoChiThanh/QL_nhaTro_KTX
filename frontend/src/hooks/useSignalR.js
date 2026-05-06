import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { tokenStorage } from '../api/axiosClient';

export const useSignalR = (hubPath = '/hubs/notification') => {
    const [notifications, setNotifications] = useState([]);
    const [connection, setConnection] = useState(null);

    useEffect(() => {
        const token = tokenStorage.getAccessToken();
        if (!token) return;

        // Cấu hình SignalR Hub Connection
        const newConnection = new signalR.HubConnectionBuilder()
            .withUrl(`http://localhost:5000${hubPath}`, {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Cơ chế tự động kết nối lại
            .configureLogging(signalR.LogLevel.Information)
            .build();

        setConnection(newConnection);

        return () => {
            if (newConnection) {
                newConnection.stop();
            }
        };
    }, [hubPath]);

    useEffect(() => {
        if (!connection) return;

        // Bắt đầu connection
        connection.start()
            .then(() => console.log(`Connected to SignalR: ${hubPath}`))
            .catch(err => console.error(`SignalR Connection Error:`, err));

        // Đăng ký sự kiện "ReceiveNotification"
        connection.on("ReceiveNotification", (notif) => {
            console.log("Real-time Notification Received:", notif);
            setNotifications((prev) => [notif, ...prev]);

            // Phát tiếng bíp hoặc hiển thị Browser Notification nếu được cấp quyền
            if (Notification.permission === 'granted') {
                new Notification(notif.title, { body: notif.message });
            }
        });

        return () => {
            connection.off("ReceiveNotification");
        };
    }, [connection, hubPath]);

    const broadcast = async (title, message) => {
        if (connection && connection.state === signalR.HubConnectionState.Connected) {
            await connection.invoke("BroadcastNotification", title, message);
        }
    };

    return { notifications, broadcast, connectionState: connection?.state };
};
