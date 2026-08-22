import requests
import os

def send_alert(changes):
    if not changes:
        return
        
    message = "🚨 *PM Golf Updates* 🚨\n\n"
    
    for change in changes:
        if change['type'] == 'PRICE_CHANGE':
            message += f"📉 *Price Changed*: {change['code']} - {change['name']}\n"
            message += f"   Old: {change['old_price']} THB -> New: {change['new_price']} THB\n"
            message += f"   Link: {change['url']}\n\n"
        elif change['type'] == 'NEW_PRODUCT':
            message += f"🌟 *New Product*: {change['code']} - {change['name']}\n"
            message += f"   Price: {change['new_price']} THB\n"
            message += f"   Link: {change['url']}\n\n"
            
    # Try Line Notify first
    line_token = os.environ.get('LINE_NOTIFY_TOKEN')
    if line_token:
        headers = {'Authorization': f'Bearer {line_token}'}
        data = {'message': message}
        requests.post('https://notify-api.line.me/api/notify', headers=headers, data=data)
        print("Alert sent via LINE.")
        
    # Telegram option
    telegram_bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    telegram_chat_id = os.environ.get('TELEGRAM_CHAT_ID')
    if telegram_bot_token and telegram_chat_id:
        url = f"https://api.telegram.org/bot{telegram_bot_token}/sendMessage"
        data = {
            'chat_id': telegram_chat_id,
            'text': message,
            'parse_mode': 'Markdown'
        }
        requests.post(url, data=data)
        print("Alert sent via Telegram.")
        
    # Discord option
    discord_webhook = os.environ.get('DISCORD_WEBHOOK_URL')
    if discord_webhook:
        data = {"content": message}
        requests.post(discord_webhook, json=data)
        print("Alert sent via Discord.")
