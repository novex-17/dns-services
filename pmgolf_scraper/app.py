import streamlit as st
import pandas as pd
from scraper import scrape_categories
from excel_handler import update_excel_file
from notifier import send_alert
import os
from io import BytesIO

st.set_page_config(page_title="PM Golf Scraper", layout="wide", page_icon="⛳")

st.markdown("""
    <style>
    .stButton>button {
        width: 100%;
        border-radius: 8px;
        height: 50px;
    }
    .main-header {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 20px;
    }
    </style>
""", unsafe_allow_html=True)

st.markdown('<div class="main-header">🛒 เลือกหมวดหมู่สินค้าที่ต้องการดึงข้อมูลประจำวัน (Select Categories):</div>', unsafe_allow_html=True)

# Define categories
categories = {
    "Iron Set (ชุดเหล็ก)": "https://www.pmgolfclub.com/product/iron_set",
    "Driver (ไม้ 1)": "https://www.pmgolfclub.com/product/driver",
    "Fairway (แฟร์เวย์)": "https://www.pmgolfclub.com/product/fairway_wood",
    "Hybrid / Utility (ไฮบริด)": "https://www.pmgolfclub.com/product/hybrid_utility",
    "Wedge (เวดจ์)": "https://www.pmgolfclub.com/product/wedge",
    "Putter (พัตเตอร์)": "https://www.pmgolfclub.com/product/putter",
    "Lady (ไม้ผู้หญิง)": "https://www.pmgolfclub.com/product/lady_club",
    "Lefty (ไม้ตีมือซ้าย)": "https://www.pmgolfclub.com/product/left_handed",
    "Clearance Sale": "https://www.pmgolfclub.com/product/clearance_sale",
    "Sold Out": "https://www.pmgolfclub.com/product/sold_out"
}

# Layout for category selection
cols = st.columns(5)
selected_urls = []

for i, (name, url) in enumerate(categories.items()):
    col = cols[i % 5]
    if col.checkbox(name):
        selected_urls.append(url)

st.markdown("---")
st.write("Or enter a specific URL to scrape:")
custom_url = st.text_input("", placeholder="https://www.pmgolfclub.com/product/...")

if custom_url:
    selected_urls.append(custom_url)

st.markdown("---")

col1, col2 = st.columns(2)

run_all = col1.button("⚡ ดึงสินค้าพร้อมขายทั้งหมด (All In-Stock)", type="primary")
run_new = col2.button("🔥 ดึงเฉพาะสินค้ามาใหม่ล่าสุด (New Clubs Only)", type="secondary")

if run_all or run_new:
    if not selected_urls:
        st.warning("Please select at least one category or enter a URL.")
    else:
        with st.spinner("Scraping data from PM Golf... Please wait."):
            data = scrape_categories(selected_urls, new_only=run_new)
            
        if not data:
            st.error("No data found or failed to scrape.")
        else:
            st.success(f"Successfully scraped {len(data)} products!")
            
            df = pd.DataFrame(data)
            
            # Reorder columns
            columns = [
                "Product Code", "Brand", "Model", "Category", "Set Composition", 
                "Total Pieces", "Shaft Type", "Flex", "Condition", "Price (THB)", 
                "Product URL", "Specs / Notes", "Raw Title"
            ]
            
            for col in columns:
                if col not in df.columns:
                    df[col] = ""
            df = df[columns]
            
            st.dataframe(df)
            
            # Excel Download Button
            output = BytesIO()
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                df.to_excel(writer, index=False, sheet_name='Sheet1')
            output.seek(0)
            
            st.download_button(
                label="📥 Download to Excel",
                data=output,
                file_name="pmgolf_data.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                type="primary"
            )
            
            # Save to Excel & Check Changes
            st.markdown("---")
            if st.button("🔄 Save to Local Excel & Check for Changes"):
                with st.spinner("Saving and checking for changes..."):
                    try:
                        file_path = "pmgolf_data.xlsx"
                        changes = update_excel_file(file_path, data)
                        st.success(f"Data saved successfully to {file_path}!")
                        
                        if changes:
                            st.info(f"Detected {len(changes)} changes. (Notifications are currently disabled)")
                        else:
                            st.info("No price changes or new products detected.")
                            
                    except Exception as e:
                        st.error(f"Failed to save and check changes: {e}")
