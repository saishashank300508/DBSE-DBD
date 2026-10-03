# Food Connect

Food Connect is a centralized digital platform that connects food donors (restaurants, hotels, events, households) with NGOs and volunteers. Its goal is to minimize food waste by ensuring surplus edible food is registered, matched, collected, and distributed efficiently to those facing food insecurity.

## 🌟 Key Features
- **Instant NGO Notification**: Nearby NGOs are notified instantly (within a configurable radius) when a donor posts food, using WebSockets for real-time popups.
- **Live GPS Tracking**: Real-time tracking of food pickups from the donor to the NGO, and finally to the beneficiaries.
- **Microservices Architecture**: Split into independent services for Auth, Donations, and Notifications/Tracking.
- **Secure**: JWT-based authentication with role-based access control (Donor, NGO, Volunteer, Admin).
- **Responsive UI**: Built with React, Tailwind CSS, and Leaflet for maps.

## 🏗️ Architecture

```
React Frontend (Vite) [Port: 5173]
        |
        +---> Auth Service [Port: 8081]
        |
        +---> Donation Service [Port: 8082]
        |
        +---> Notification & Tracking Service [Port: 8083] (WebSocket)
                 |
                 +---> MySQL Database [Port: 3306]
```

## 🚀 Setup Instructions

### 1. Database Setup
1. Ensure MySQL is running on port `3306`.
2. Execute the schema script: `mysql -u root -p < database/schema.sql`
3. Execute the seed script: `mysql -u root -p < database/seed.sql`
*(Update `application.properties` in each backend service if your MySQL password is not `your_mysql_password`)*

### 2. Backend Services (Spring Boot)
Open 3 separate terminals and run each service:

**Terminal 1:**
```bash
cd backend/auth-service
mvn spring-boot:run
```

**Terminal 2:**
```bash
cd backend/donation-service
mvn spring-boot:run
```

**Terminal 3:**
```bash
cd backend/notification-tracking-service
mvn spring-boot:run
```

### 3. Frontend (React Vite)
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Access the app at `http://localhost:5173`

## 🧪 Testing with Postman
Import the `postman/FoodConnect.postman_collection.json` file into Postman. 
1. Run the `Login` request. The token will be saved to your environment automatically.
2. Run other protected endpoints.

## 📖 User Flow (Demo)
1. Login as Donor (`hotel.sunrise@demo.com` / `Donor@123`) in one browser window.
2. Login as NGO (`helpinghands@demo.com` / `Ngo@12345`) in another browser window (or incognito).
3. As Donor, click "Donate Food" and submit.
4. As NGO, you will see a real-time popup instantly! Click "Accept".
5. The Donor can then click "Track Live" to see the map.

## 📁 Repository Structure
- `/frontend` - React application
- `/backend` - Spring Boot microservices
- `/database` - MySQL schema and seed data
- `/postman` - API Testing collection
- `/docs` - System diagrams
