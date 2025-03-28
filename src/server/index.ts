import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import User from './models/User';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const WEBHOOK_URL = process.env.WEBHOOK_URL || `https://${process.env.RENDER_EXTERNAL_URL}/webhook/${TELEGRAM_BOT_TOKEN}`;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/black-mark-app')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err: Error) => console.error('MongoDB connection error:', err));

// Telegram Bot setup
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { 
  webHook: {
    port: port
  }
});

// Установка webhook
bot.setWebHook(WEBHOOK_URL).then(() => {
  console.log('Webhook set successfully');
}).catch((error) => {
  console.error('Error setting webhook:', error);
});

// Обработка ошибок бота
bot.on('error', (error: Error) => {
  console.error('Telegram Bot error:', error);
});

// Базовые команды бота
bot.onText(/\/start/, async (msg: Message) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username || msg.from?.first_name || 'Пользователь';
  
  try {
    // Создаем или обновляем пользователя
    await User.findOneAndUpdate(
      { telegramId: msg.from?.id },
      { 
        telegramId: msg.from?.id,
        username: username,
        stars: 0,
        blackMark: false
      },
      { upsert: true }
    );

    const welcomeMessage = `Добро пожаловать в систему чёрных меток, ${username}! 🎯\n\n` +
      'Доступные команды:\n' +
      '/balance - Проверить баланс звёздочек\n' +
      '/mark - Отправить чёрную метку\n' +
      '/remove - Снять чёрную метку (50 звёздочек)\n' +
      '/help - Показать это сообщение';
    
    bot.sendMessage(chatId, welcomeMessage);
  } catch (error) {
    console.error('Error in /start command:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при регистрации. Попробуйте позже.');
  }
});

// Проверка баланса
bot.onText(/\/balance/, async (msg: Message) => {
  const chatId = msg.chat.id;
  
  try {
    const user = await User.findOne({ telegramId: msg.from?.id });
    if (!user) {
      bot.sendMessage(chatId, 'Пожалуйста, сначала используйте команду /start');
      return;
    }

    const message = `Ваш баланс: ${user.stars} ⭐️\n` +
      `Статус чёрной метки: ${user.blackMark ? 'Активна' : 'Нет'}`;
    
    bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error in /balance command:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при проверке баланса. Попробуйте позже.');
  }
});

// Отправка чёрной метки
bot.onText(/\/mark/, async (msg: Message) => {
  const chatId = msg.chat.id;
  
  try {
    const user = await User.findOne({ telegramId: msg.from?.id });
    if (!user) {
      bot.sendMessage(chatId, 'Пожалуйста, сначала используйте команду /start');
      return;
    }

    if (user.blackMark) {
      bot.sendMessage(chatId, 'Вы не можете отправлять чёрные метки, пока у вас есть активная метка!');
      return;
    }

    // Здесь будет логика выбора пользователя для отправки метки
    bot.sendMessage(chatId, 'Выберите пользователя из списка контактов для отправки чёрной метки:');
  } catch (error) {
    console.error('Error in /mark command:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при отправке метки. Попробуйте позже.');
  }
});

// Снятие чёрной метки
bot.onText(/\/remove/, async (msg: Message) => {
  const chatId = msg.chat.id;
  
  try {
    const user = await User.findOne({ telegramId: msg.from?.id });
    if (!user) {
      bot.sendMessage(chatId, 'Пожалуйста, сначала используйте команду /start');
      return;
    }

    if (!user.blackMark) {
      bot.sendMessage(chatId, 'У вас нет активной чёрной метки!');
      return;
    }

    if (user.stars < 50) {
      bot.sendMessage(chatId, 'Недостаточно звёздочек! Нужно 50 ⭐️');
      return;
    }

    // Снимаем метку и списываем звёздочки
    user.blackMark = false;
    user.stars -= 50;
    await user.save();

    // Начисляем звёздочки отправителю метки
    if (user.blackMarkFrom) {
      const markSender = await User.findOne({ telegramId: user.blackMarkFrom });
      if (markSender) {
        markSender.stars += 5;
        await markSender.save();
      }
    }

    bot.sendMessage(chatId, 'Чёрная метка успешно снята! -50 ⭐️');
  } catch (error) {
    console.error('Error in /remove command:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при снятии метки. Попробуйте позже.');
  }
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/balance', async (req, res) => {
  try {
    const telegramId = req.query.telegramId;
    if (!telegramId) {
      return res.status(400).json({ error: 'Telegram ID is required' });
    }

    const user = await User.findOne({ telegramId: Number(telegramId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      stars: user.stars,
      blackMark: user.blackMark
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 