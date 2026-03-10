import React from 'react';

const Closed = () => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontSize: '24px',
            textAlign: 'center',
        }}>
            <h1>The app is closed for a while due to Spotify API limits on the owner's free account;</n            it's not your fault; it's the owner's fault; and the owner needs Spotify Premium for users to use it.</h1>
        </div>
    );
};

export default Closed;