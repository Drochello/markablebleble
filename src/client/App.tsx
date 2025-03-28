import React from 'react';
import WebApp from '@twa-dev/sdk';
import './App.css';

const App: React.FC = () => {
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    // Инициализация Telegram WebApp
    WebApp.ready();
    
    // Получение данных пользователя
    const userData = WebApp.initDataUnsafe.user;
    if (userData) {
      setUser(userData);
    }
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Система Чёрных Меток</h1>
      </header>
      <main>
        {user ? (
          <div className="user-info">
            <h2>Привет, {user.first_name}!</h2>
            <div className="stars">
              Звёздочки: {user.stars || 0}
            </div>
          </div>
        ) : (
          <div className="loading">
            Загрузка...
          </div>
        )}
      </main>
    </div>
  );
};

export default App; 