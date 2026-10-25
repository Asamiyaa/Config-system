import unittest
from unittest.mock import patch
from datetime import date, timedelta
from astock_data_backup import fetch_etf_daily, _market_code

class BackupAdapterTests(unittest.TestCase):
    def test_market_code_routing(self):
        self.assertEqual(_market_code('510300'), 'sh510300')
        self.assertEqual(_market_code('159915'), 'sz159915')
        with self.assertRaises(ValueError): _market_code('51030')

    def test_valid_daily_bars(self):
        rows=[]
        today=date.today()
        for i in range(100, 0, -1):
            d=today-timedelta(days=i)
            if d.weekday()>=5: continue
            close=3.0+i/10000
            rows.append([d.isoformat(), str(close), str(close), str(close+.01), str(close-.01), '1000', '3000'])
        payload={'data':{'sh510300':{'day':rows}}}
        with patch('astock_data_backup._request_json', return_value=payload):
            result=fetch_etf_daily('510300')
        self.assertGreaterEqual(result['rows'], 65)
        self.assertGreater(result['price'], 0)
        self.assertEqual(result['sourceTier'], 'backup')
        self.assertIn('ma60', result)

    def test_empty_data_rejected(self):
        payload={'data':{'sh510300':{'day':[]}}}
        with patch('astock_data_backup._request_json', return_value=payload):
            with self.assertRaises(ValueError): fetch_etf_daily('510300')

if __name__ == '__main__': unittest.main()
