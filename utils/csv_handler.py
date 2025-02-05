import pandas as pd
from typing import List, Dict, Optional
import csv
import io

class CSVHandler:
    @staticmethod
    def validate_headers(headers: List[str]) -> bool:
        required = {"address"}
        return required.issubset(set(headers))

    @staticmethod
    def read_csv(file) -> List[Dict]:
        try:
            # Read first line to check headers
            first_line = file.readline().decode('utf-8')
            headers = first_line.strip().split(',')
            
            if not CSVHandler.validate_headers(headers):
                raise ValueError("CSV must contain 'address' column")
            
            # Reset file pointer
            file.seek(0)
            
            df = pd.read_csv(file)
            return df.to_dict('records')
        except Exception as e:
            raise ValueError(f"Error reading CSV: {str(e)}")

    @staticmethod
    def export_results(data: List[Dict], include_fields: Optional[List[str]] = None) -> str:
        try:
            df = pd.DataFrame(data)
            if include_fields:
                df = df[include_fields]
            
            output = io.StringIO()
            df.to_csv(output, index=False)
            return output.getvalue()
        except Exception as e:
            raise ValueError(f"Error exporting CSV: {str(e)}")

    @staticmethod
    def validate_row(row: Dict) -> bool:
        return bool(row.get("address"))
