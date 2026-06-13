import sys
import os

# Add root directory to python path to import server.py safely
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from mangum import Mangum
from server import app

handler = Mangum(app, lifespan="off")
