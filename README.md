# Firebase Backend Application

This project is a backend application built using Firebase, specifically utilizing Firestore for data storage. It is designed to manage various entities related to user engagement, workshops, forums, and more.

## Project Structure

The project is organized into the following main directories and files:

- **src/**: Contains the source code for the application.
  - **entities/**: Defines the data models for the application.
    - `user.ts`: User entity with properties and relationships.
    - `profile.ts`: Profile entity related to the User.
    - `company.ts`: Company entity with relationships to Plan and Subcompany.
    - `plan.ts`: Plan entity defining user limits and features.
    - `subcompany.ts`: Subcompany entity with relationships to Company and User.
    - `news.ts`: News entity authored by Users.
    - `workshop.ts`: Workshop entity with details and relationships.
    - `userWorkshop.ts`: UserWorkshop entity tracking user participation.
    - `forum.ts`: Forum entity for discussions.
    - `post.ts`: Post entity within a forum.
    - `response.ts`: Response entity for posts.
    - `reaction.ts`: Reaction entity for user interactions.
    - `follow.ts`: Follow entity for user relationships.
    - `notification.ts`: Notification entity for user alerts.
    - `dailyQuest.ts`: DailyQuest entity for user challenges.
    - `userDailyQuest.ts`: UserDailyQuest entity tracking user progress.
    - `engagementXpAction.ts`: EngagementXpAction entity for tracking actions.
    - `workshopPath.ts`: WorkshopPath entity for structured workshops.
    - `workshopPathStep.ts`: WorkshopPathStep entity for steps in a workshop path.
    - `certification.ts`: Certification entity for user achievements.
  - **controllers/**: Contains controller functions for handling requests.
  - **routes/**: Defines the API routes for each entity.
  - **services/**: Contains business logic and Firestore interactions.
  - **utils/**: Utility functions, including Firebase initialization.
  - `index.ts`: Entry point of the application.

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd firebase-backend-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Firebase**:
   - Create a Firebase project in the Firebase console.
   - Obtain your Firebase configuration and add it to the `src/utils/firebase.ts` file.

4. **Run the application**:
   ```bash
   npm start
   ```

## API Endpoints

The application exposes various API endpoints for managing users, workshops, forums, and more. Refer to the `src/routes/[entityRoutes].ts` file for detailed endpoint definitions.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or features.

## License

This project is licensed under the MIT License. See the LICENSE file for details.