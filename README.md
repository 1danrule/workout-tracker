# WorkoutTracker

A web application for tracking workouts and gym progress.

## About

WorkoutTracker is an open-source fitness tracking app built for people who train seriously. 
It helps you log your workouts, track your progress over time, and stick to your goals.

## Features

- Workout diary with weight, sets, and reps tracking
- Progress charts for each exercise
- Exercise library with descriptions
- Ready-made workout programs (Full Body, PPL, Upper/Lower)
- Custom workout builder
- Rest timer between sets
- Calculators (1RM, working weights)

## Tech Stack

**Backend:**
- Django + Django REST Framework
- PostgreSQL
- JWT Authentication

**Frontend:**
- React
- Tailwind CSS
- Recharts

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 16+
- PostgreSQL

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/workouttracker.git
cd workouttracker
```

2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

3. Frontend setup
```bash
cd frontend
npm install
npm start
```

## Roadmap

- [ ] User authentication
- [ ] Workout logging
- [ ] Progress charts
- [ ] Exercise library
- [ ] Community features (share programs)
- [ ] PWA support
- [ ] Nutrition tracking (v2.0)

## Contributing

Feel free to open issues or submit pull requests

## License

MIT License

Contributions are welcome. Feel free to open issues or submit pull requests.

## License

MIT License - see LICENSE file for details
