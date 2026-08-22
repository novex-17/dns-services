import pandas as pd
import os

def update_excel_file(file_path, data):
    """
    Update the local Excel file and return a list of changed products for alert.
    """
    if not data:
        return []
        
    new_df = pd.DataFrame(data)
    
    # Order columns
    columns = [
        "Product Code", "Brand", "Model", "Category", "Set Composition", 
        "Total Pieces", "Shaft Type", "Flex", "Condition", "Price (THB)", 
        "Product URL", "Specs / Notes", "Raw Title"
    ]
    
    # Ensure all columns exist
    for col in columns:
        if col not in new_df.columns:
            new_df[col] = ""
            
    # Reorder
    new_df = new_df[columns]
    
    changes = []
    
    if os.path.exists(file_path):
        existing_df = pd.read_excel(file_path)
        
        if not existing_df.empty and 'Product Code' in existing_df.columns:
            # Compare
            for _, new_row in new_df.iterrows():
                code = new_row['Product Code']
                matching_rows = existing_df[existing_df['Product Code'] == code]
                
                if not matching_rows.empty:
                    old_row = matching_rows.iloc[0]
                    old_price = str(old_row.get('Price (THB)', '')).strip()
                    new_price = str(new_row.get('Price (THB)', '')).strip()
                    
                    # Check price change
                    if old_price != new_price:
                        changes.append({
                            'code': code,
                            'name': new_row.get('Raw Title', ''),
                            'url': new_row.get('Product URL', ''),
                            'old_price': old_price,
                            'new_price': new_price,
                            'type': 'PRICE_CHANGE'
                        })
                else:
                    # New product
                    changes.append({
                        'code': code,
                        'name': new_row.get('Raw Title', ''),
                        'url': new_row.get('Product URL', ''),
                        'old_price': 'N/A',
                        'new_price': new_row.get('Price (THB)', ''),
                        'type': 'NEW_PRODUCT'
                    })
    else:
        print("No existing Excel file found. Creating a new one...")
        
    # Overwrite the Excel file
    new_df.to_excel(file_path, index=False)
    
    return changes
