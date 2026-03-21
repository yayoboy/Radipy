# ✨ Radipy - Tkinter GUI Builder

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Radipy** è un GUI Builder visuale per **Tkinter Python** che permette di progettare interfacce grafiche tramite drag-and-drop e genera automaticamente codice Python OOP pronto per l'uso.

![Radipy Screenshot](docs/screenshot.png)

---

## 📋 Indice

- [Caratteristiche](#-caratteristiche)
- [Stack Tecnologico](#-stack-tecnologico)
- [Installazione](#-installazione)
- [Utilizzo](#-utilizzo)
- [Widget Supportati](#-widget-supportati)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Docker](#-docker)
- [Roadmap](#-roadmap)
- [Contribuire](#-contribuire)
- [Licenza](#-licenza)

---

## ✨ Caratteristiche

### Core Features
- 🎨 **Canvas Drag & Drop** - Design UI visuale con drag & drop intuitivo
- 📐 **Resize & Positioning** - Ridimensiona e posiziona componenti con precisione
- 🗂️ **Multi-Tab Support** - Gestisci progetti complessi con più pagine/tabs
- 🎭 **Theme Selection** - Scegli tra 9 temi ttkbootstrap integrati
- 🔧 **Properties Inspector** - Modifica proprietà widget in tempo reale
- 🌳 **Layer Tree** - Naviga la gerarchia dei componenti
- 💾 **Auto-Save** - Salvataggio automatico su localStorage
- 🐍 **OOP Code Generation** - Genera codice Python class-based pulito

### Widget Avanzati
- 🗺️ **MapView** - Mappe interattive con `tkintermapview`
- 📊 **MatplotlibChart** - Grafici scientifici embedded
- 📅 **DateEntry** - Calendario per selezione date
- 📈 **Meter** - Indicatori circolari (progress ring)

---

## 🛠️ Stack Tecnologico

| Layer | Tecnologia | Versione |
|-------|------------|----------|
| **Frontend** | React | 18.2.0 |
| **Build Tool** | Vite | 5.2.0 |
| **Backend** | FastAPI | 0.110.0 |
| **Runtime** | Python | 3.11+ |
| **Server** | Uvicorn | 0.28.0 |
| **Validation** | Pydantic | 2.6.3 |
| **Container** | Docker | - |

---

## 🚀 Installazione

### Prerequisiti

- Python 3.11+
- Node.js 18+
- Docker (opzionale)

### Setup Development

#### 1. Clone del Repository

```bash
git clone https://github.com/yourusername/radipy.git
cd radipy
```

#### 2. Backend Setup

```bash
cd backend

# Crea virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# oppure: venv\Scripts\activate  # Windows

# Installa dipendenze
pip install -r requirements.txt

# Avvia server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 3. Frontend Setup

```bash
cd frontend

# Installa dipendenze
npm install

# Avvia dev server
npm run dev
```

#### 4. Accesso

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 📖 Utilizzo

### Workflow Base

1. **Seleziona Widget** - Clicca un widget dalla sidebar "Widgets"
2. **Trascina sul Canvas** - Drag & drop per posizionare
3. **Modifica Proprietà** - Usa l'Inspector a destra
4. **Gestisci Tabs** - Aggiungi/rimuovi pagine per UI complesse
5. **Scegli Tema** - Seleziona un tema ttkbootstrap
6. **Genera Codice** - Clicca "Generate OOP Code"
7. **Copia & Usa** - Il codice è pronto per essere eseguito

### Esempio Codice Generato

```python
import ttkbootstrap as ttk
from ttkbootstrap.constants import *

class App(ttk.Window):
    def __init__(self):
        super().__init__(themename='darkly')
        self.title('Radipy Generated UI')
        self.geometry('800x600')
        self.setup_ui()

    def setup_ui(self):
        # --- Page: Main ---
        self.btn_submit = ttk.Button(
            self, 
            text='Submit',
            bootstyle='primary',
            command=self.on_submit
        )
        self.btn_submit.place(x=100, y=50, width=100, height=35)

    def on_submit(self):
        print('Event on_submit triggered!')

if __name__ == '__main__':
    app = App()
    app.mainloop()
```

### Esempio con MapView

```python
import tkintermapview

# MapView setup
self.map_1 = tkintermapview.TkinterMapView(self)
self.map_1.set_address('Rome, Italy')
self.map_1.set_zoom(10)
```

---

## 🧩 Widget Supportati

### Widget Base
| Widget | Descrizione | Props |
|--------|-------------|-------|
| `Button` | Pulsante cliccabile | `text`, `bootstyle`, `commandEvent` |
| `Label` | Testo descrittivo | `text`, `fg`, `bg` |
| `Entry` | Input testo singola linea | `text` |
| `Text` | Area testo multi-linea | `text` |
| `Checkbutton` | Checkbox booleano | `text`, `commandEvent` |

### Widget ttk
| Widget | Descrizione | Props |
|--------|-------------|-------|
| `ttk.Progressbar` | Barra di progressione | `value`, `bootstyle` |
| `ttk.Combobox` | Menu dropdown | `values` (comma-separated) |
| `ttk.Scale` | Slider numerico | `value`, `from_`, `to` |
| `ttk.Spinbox` | Input numerico con frecce | `from_`, `to` |
| `ttk.Treeview` | Tabella/Albero dati | `columns` (comma-separated) |

### Widget ttkbootstrap
| Widget | Descrizione | Props |
|--------|-------------|-------|
| `ttk.DateEntry` | Calendario popup | `bootstyle` |
| `ttk.Meter` | Indicatore circolare | `amountused`, `bootstyle` |
| `ttk.Labelframe` | Frame con titolo | `text` |

### Widget Speciali
| Widget | Descrizione | Dipendenze |
|--------|-------------|------------|
| `MapView` | Mappa interattiva | `pip install tkintermapview` |
| `MatplotlibChart` | Grafici scientifici | `pip install matplotlib` |
| `Icon` | Icona Material Design | Built-in (visualizzato come placeholder) |

---

## 🔌 API Reference

### Endpoints

#### `GET /`
Health check endpoint.

**Response:**
```json
{
  "message": "Welcome to Radipy API! Use POST /generate to create Tkinter code."
}
```

---

#### `POST /generate`
Genera codice Python Tkinter dal JSON schema.

**Request Body:**
```json
{
  "theme": "darkly",
  "pages": [
    {
      "name": "Main Page",
      "components": [
        {
          "type": "Button",
          "id": "btn_submit",
          "props": {
            "text": "Click Me",
            "bootstyle": "primary"
          },
          "layout": {
            "x": 100,
            "y": 50,
            "width": 100,
            "height": 35
          }
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "code": "import ttkbootstrap as ttk\n\nclass App(ttk.Window):\n    ..."
}
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Esegui tutti i test
pytest

# Con coverage
pytest --cov=. --cov-report=html

# Test specifici
pytest tests/test_generator.py -v
pytest tests/test_api.py -v
```

### Frontend Tests

```bash
cd frontend

# Esegui test in watch mode
npm run test

# Esegui test una tantum
npm run test:run

# Con coverage
npm run test:coverage
```

---

## 🐳 Docker

### Development

```bash
# Avvia con docker-compose
docker-compose up --build

# Servizi disponibili:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:8000
```

### Production

```bash
# Build immagini production
docker-compose -f docker-compose.prod.yml up --build -d

# Servizi:
# - Frontend (Nginx): http://localhost:80
# - Backend: http://localhost:8000
```

### Singoli Container

```bash
# Backend
cd backend
docker build -t radipy-backend .
docker run -p 8000:8000 radipy-backend

# Frontend
cd frontend
docker build -t radipy-frontend .
docker run -p 3000:3000 radipy-frontend
```

---

## 🗺️ Roadmap

### v0.1.0 (Current)
- [x] Drag & drop canvas
- [x] Code generation OOP
- [x] Multi-tab support
- [x] Theme selection
- [x] Basic testing

### v0.2.0 (Next)
- [ ] Undo/Redo functionality
- [ ] Export to PDF/PNG
- [ ] UI Templates library
- [ ] Keyboard shortcuts
- [ ] Grid snapping

### v0.3.0 (Future)
- [ ] Real-time collaboration
- [ ] Git integration
- [ ] Plugin system
- [ ] Custom widget creation
- [ ] Code preview with syntax highlighting

---

## 🤝 Contribuire

Contributi sono benvenuti! Per favore:

1. Fai un fork del repository
2. Crea un branch feature (`git checkout -b feature/amazing-feature`)
3. Commit delle modifiche (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Apri una Pull Request

### Coding Standards

- **Python**: Segui PEP 8, usa type hints
- **JavaScript**: Segui Airbnb style guide
- **Commit**: Conventional commits format

---

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi il file [LICENSE](LICENSE) per dettagli.

---

## 📞 Contatti

- **Issues**: [GitHub Issues](https://github.com/yourusername/radipy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/radipy/discussions)

---

<p align="center">
  Made with ❤️ by the Radipy Team
</p>
