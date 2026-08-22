import requests
from bs4 import BeautifulSoup
import re

BASE_URL = "https://www.pmgolfclub.com"

def get_product_links(category_url, new_only=False):
    links = []
    page = 1
    while True:
        url = f"{category_url}?page={page}"
        print(f"Scraping category page {page}: {url}")
        response = requests.get(url)
        if response.status_code != 200:
            break
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # In PM Golf, product links are inside a tags within div.product_name
        product_divs = soup.find_all('div', class_='product_name')
        if not product_divs:
            break
            
        for div in product_divs:
            a_tag = div.find('a')
            if a_tag and a_tag.get('href'):
                links.append(a_tag['href'])
                
        # Check if there is a next page
        pagination = soup.find('div', class_='pagination')
        if not pagination or '>&gt;</a>' not in str(pagination) and 'Next' not in str(pagination):
            # Try to see if there is a next page link
            next_link = soup.find('a', string=re.compile(r'>|Next|ถัดไป'))
            if not next_link:
                break
                
        page += 1
        
        # If new_only is True, maybe just scrape first page
        if new_only and page > 1:
            break
            
    return list(set(links))

def scrape_product_details(product_url):
    try:
        response = requests.get(product_url)
        if response.status_code != 200:
            return None
            
        soup = BeautifulSoup(response.content.decode('utf-8', 'ignore'), 'html.parser')
        
        # Raw title
        title_h1 = soup.find('h1')
        raw_title = title_h1.text.strip() if title_h1 else ""
        
        # Extract fields from description section
        details = {
            "Product Code": "",
            "Category": "",
            "Brand": "",
            "Condition": "",
            "Price (THB)": "",
            "Product URL": product_url,
            "Specs / Notes": "",
            "Raw Title": raw_title,
            "Model": "",
            "Set Composition": "",
            "Total Pieces": "",
            "Shaft Type": "",
            "Flex": ""
        }
        
        # Field mapping
        field_mapping = {
            "รหัสสินค้า": "Product Code",
            "หมวดหมู่": "Category",
            "ยี่ห้อ": "Brand",
            "สภาพสินค้า": "Condition",
            "ราคา": "Price (THB)"
        }
        
        description_div = soup.find('div', class_='description')
        if description_div:
            price_divs = description_div.find_all('div', class_='price')
            for pd in price_divs:
                cols = pd.find_all('div', align='left')
                if len(cols) == 2:
                    key = cols[0].text.strip()
                    val = cols[1].text.strip()
                    if key in field_mapping:
                        if key == 'ราคา':
                            val = val.replace('฿', '').replace(',', '').strip()
                        details[field_mapping[key]] = val
                        
        # Specs / Notes (รายละเอียดเพิ่มเติม)
        tab_content = soup.find('div', class_='tab-content')
        if tab_content:
            paragraphs = [p.text.strip() for p in tab_content.find_all('p') if p.text.strip()]
            details["Specs / Notes"] = "\n".join(paragraphs)
            
            # Simple heuristic extraction for Model, Set Composition, Total Pieces, Shaft, Flex
            # You can improve this with better NLP or regex based on their format
            text = details["Specs / Notes"]
            
            # Find pieces
            pieces_match = re.search(r'\((\d+)\s*ชิ้น\)', text)
            if pieces_match:
                details["Total Pieces"] = pieces_match.group(1)
                
            # Find Flex
            flex_match = re.search(r'FLEX\s+([A-Z0-9]+)', text, re.IGNORECASE)
            if flex_match:
                details["Flex"] = flex_match.group(1).upper()
                
            # Find composition
            comp_match = re.search(r'มีเหล็ก\s+([A-Za-z0-9\-,\s]+)\(', text)
            if comp_match:
                details["Set Composition"] = comp_match.group(1).strip()
                
            # Find Shaft
            if 'ก้านกราไฟต์' in text:
                details["Shaft Type"] = 'Graphite'
            elif 'ก้านเหล็ก' in text:
                details["Shaft Type"] = 'Steel'

            # Try to get Model from title or first line of specs
            if paragraphs:
                details["Model"] = paragraphs[0].replace(details.get("Brand", ""), "").strip()
                if not details["Model"] and details["Raw Title"]:
                    details["Model"] = details["Raw Title"].split('(')[0].replace(details.get("Brand", ""), "").replace("ชุดเหล็ก", "").strip()
                
        return details
    except Exception as e:
        print(f"Error scraping {product_url}: {e}")
        return None

def scrape_categories(category_urls, new_only=False):
    all_data = []
    for cat_url in category_urls:
        print(f"Starting category: {cat_url}")
        links = get_product_links(cat_url, new_only)
        print(f"Found {len(links)} products.")
        
        for i, link in enumerate(links):
            print(f"Scraping product {i+1}/{len(links)}: {link}")
            data = scrape_product_details(link)
            if data:
                all_data.append(data)
                
    return all_data
