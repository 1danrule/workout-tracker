# WorkoutTracker

A mobile app for tracking nutrition and workouts, built to be fast and simple to use.

## About

I started this project because the app I used for tracking calories and macros got harder to use after a redesign. WorkoutTracker focuses on one thing first: logging food in as few taps as possible. Workout tracking comes after that.

The project is open source. The backend is a REST API built with Django, and the mobile app is built with React Native (Expo).

## Features

**Nutrition (main focus)**
- Daily food diary with calories, protein, fat and carbs
- Daily targets calculated from your height, weight, age and goal
- Food search and barcode scanning (powered by Open Food Facts)
- Custom foods for products that are not in the database
- Recent and frequently used foods for quick logging

**Workouts**
- Exercise library
- Workout diary with sets, reps and weight
- Progress charts for each exercise
- Ready-made programs and a custom program builder

## Tech Stack

**Backend**
- Django and Django REST Framework
- PostgreSQL (Neon)
- JWT authentication (simplejwt)

**Mobile app**
- React Native with Expo

**Data**
- Open Food Facts API

## Project Structure

```
backend/    Django REST API
mobile/     Expo app (not started yet)
```

## Getting Started

### Prerequisites
- Python 3.10+
- A PostgreSQL database (a free Neon project works fine)

### Backend setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/workout-tracker.git
cd workout-tracker
```

2. Create a `.env` file in the project root
```
POSTGRES_HOST=your_host
POSTGRES_DB=your_database
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_PORT=5432
SECRET_KEY=your_secret_key
DEBUG=True
```

3. Install dependencies and run the server
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_exercises
python manage.py runserver
```

The API runs at `http://127.0.0.1:8000/` and the admin panel at `/admin/`.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Create an account |
| POST | `/api/auth/login/` | Get JWT access and refresh tokens |
| POST | `/api/auth/refresh/` | Refresh the access token |
| GET, PATCH | `/api/auth/profile/` | View or update your profile |
| GET | `/api/exercises/` | List exercises |

## Roadmap

- [x] User registration, login and profile
- [x] Exercise library
- [ ] Nutrition models (foods and diary entries)
- [ ] Daily calorie and macro targets
- [ ] Open Food Facts integration (search and barcode)
- [ ] Mobile app: login and daily diary
- [ ] Mobile app: barcode scanner
- [ ] Workout logging and progress charts
- [ ] App Store release

## Contributing

Contributions are welcome. Feel free to open an issue or submit a pull request.

## License

MIT License, see the LICENSE file for details.
