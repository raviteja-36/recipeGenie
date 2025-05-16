require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize
const bot = new Telegraf(process.env.TELEGRAM_BOT_API_TOKEN);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Storage
const userPreferences = {};
const recipeCategories = [
    'Breakfast', 'Lunch', 'Dinner',
    'Vegetarian', 'Vegan', 'Desserts',
    'Quick Meals', 'Healthy', 'Comfort Food'
];

// Helper function
async function generateRecipe(prompt) {
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (e) {
        console.error("Generation Error:", e);
        return null;
    }
}

// Start command with working buttons
bot.start((ctx) => {
    ctx.replyWithMarkdown(
        `👋 *Welcome to RecipeGenie, ${ctx.from.first_name}!* 🍽️\n` +
        "Your AI-powered culinary assistant!\n\n",
        Markup.keyboard([
            ['🍳 Random Recipe', '⭐ My Preferences'],
            ['📖 Recipe Categories', 'ℹ️ About']
        ]).resize()
    );
});

// Help command
bot.help((ctx) => ctx.replyWithMarkdown(
    "*Need help?*\n\n" +
    "Here's what I can do:\n" +
    "- Type any ingredient/dish for recipes\n" +
    "- Use buttons for quick access\n" +
    "- Special commands:\n" +
    "  /saved - Your saved recipes\n" +
    "  /preferences - Set dietary needs\n" +
    "  /feedback - Share thoughts"
));

// About button handler (FIXED)
bot.hears('ℹ️ About', (ctx) => {
    ctx.replyWithMarkdown(
        "*🍽️ RecipeGenie v2.0*\n\n" +
        "An AI-powered recipe assistant\n\n" +
        "✨ *Features:*\n" +
        "- Instant recipe generation\n" +
        "- Dietary preference tracking\n" +
        "- Saved recipes collection\n\n" +
        "🔧 *Developer:* Raviteja\n" +
        "📆 Last update: " + new Date().toLocaleDateString()
    );
});

// Preferences button handler (FIXED)
bot.hears('⭐ My Preferences', (ctx) => {
    const userId = ctx.from.id;
    const prefs = userPreferences[userId]?.diet || 'Not set';
    
    ctx.reply(
        `Your current preferences: ${prefs}\n\n` +
        "Change them with:",
        Markup.inlineKeyboard([
            [Markup.button.callback('Vegetarian', 'set_vegetarian')],
            [Markup.button.callback('Vegan', 'set_vegan')],
            [Markup.button.callback('Non-Vegetarian', 'set_nonveg')],
            [Markup.button.callback('Reset', 'reset_prefs')]
        ])
    );
});

// Categories handler
bot.hears('📖 Recipe Categories', (ctx) => {
    ctx.reply(
        "Choose a category:",
        Markup.inlineKeyboard(
            recipeCategories.map(category => 
                [Markup.button.callback(category, `category_${category.toLowerCase()}`)]
            )
        )
    );
});

// Random recipe handler
bot.hears('🍳 Random Recipe', async (ctx) => {
    ctx.replyWithChatAction('typing');
    const recipe = await generateRecipe(
        "Generate a random recipe with:\n" +
        "- Creative name\n- Ingredients list\n- Simple steps\n" +
        "- Cooking time\n- Difficulty level\n" +
        "Add food emojis (max 500 chars)"
    );
    ctx.reply(recipe || "⚠️ Failed to generate recipe");
});

// Text handler (FIXED)
bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/') || 
        ['🍳 Random Recipe', '⭐ My Preferences', 'ℹ️ About', '📖 Recipe Categories'].includes(ctx.message.text)) return;
    
    const recipe = await generateRecipe(
        `Create a recipe for: ${ctx.message.text}\n` +
        "Include:\n1. Ingredients\n2. Steps\n3. Time\n" +
        "Format with emojis (max 400 chars)"
    );
    ctx.reply(recipe || "⚠️ Couldn't generate recipe");
});

// Callback handlers
bot.action(/category_(.+)/, async (ctx) => {
    const category = ctx.match[1];
    const recipe = await generateRecipe(
        `Generate a ${category} recipe with ingredients and steps`
    );
    ctx.reply(recipe || "⚠️ Category recipe failed");
});

bot.action(['set_vegetarian', 'set_vegan','set_nonveg', 'reset_prefs'], (ctx) => {
    const userId = ctx.from.id;
    const choice = ctx.match[0];
    
    if (!userPreferences[userId]) userPreferences[userId] = {};
    
    if (choice === 'reset_prefs') {
        delete userPreferences[userId].diet;
        ctx.answerCbQuery("Preferences reset!");
    } else {
        userPreferences[userId].diet = choice.replace('set_', '');
        ctx.answerCbQuery(`${userPreferences[userId].diet} mode set!`);
    }
});

// Launch
console.log("🚀 Bot is running...");
bot.launch()
    .then(() => console.log("Connected to Telegram"))
    .catch(err => console.error("Connection failed:", err));

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));