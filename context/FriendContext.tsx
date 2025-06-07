import React, { createContext, useState, useContext, ReactNode } from 'react';

interface FriendDetails {
    id: string;
    name: string;
    avatarUrl?: string | null;
    registered_user_id?: string | null;
    email?: string | null;
}

interface FriendContextProps {
    currentFriend: FriendDetails | null;
    setCurrentFriend: (friend: FriendDetails | null) => void;
}

const FriendContext = createContext<FriendContextProps | undefined>(undefined);

export const FriendProvider = ({ children }: { children: ReactNode }) => {
    const [currentFriend, setCurrentFriend] = useState<FriendDetails | null>(null);
    console.log('FriendProvider: currentFriend', currentFriend);
    return (
        <FriendContext.Provider value={{ currentFriend, setCurrentFriend }}>
            {children}
        </FriendContext.Provider>
    );
};

export const useCurrentFriend = () => {
    const context = useContext(FriendContext);
    if (context === undefined) {
        throw new Error('useCurrentFriend deve ser usado dentro de um FriendProvider');
    }
    return context;
};
