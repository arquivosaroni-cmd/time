# **App Name**: TimeFlow

## Core Features:

- User Authentication: Enable users to sign up, log in, and manage their profiles securely.
- Group Creation and Management: Allow users to create workgroups and invite other users to join. Use a Firestore database to manage group memberships.
- Service Insertion: Enable users to add service tasks to the workgroup's task board, with title, description, and assigned user. Use a Firestore database to persist tasks.
- Real-time Status Updates: Implement real-time updates for service statuses (Production, Finalized, Pending) using Firestore.
- Task Assignment: Visually display which user is assigned to each service task within the group. Use a Firestore database to track assigned users for each task.
- Status Categorization: Color-code service status: production (yellow), finalized (green), and pending (orange) to quickly assess task status.

## Style Guidelines:

- Primary color: Slate blue (#7395AE) to evoke professionalism and trustworthiness.
- Background color: Very light blue (#D1DADE) for a clean, calming backdrop.
- Accent color: Light teal (#AEC3B0) for highlighting important interactive elements and call-to-action buttons.
- Body and headline font: 'Inter' (sans-serif) for a clean and modern look.
- Responsive design using a column-based layout on desktop and a streamlined, mobile-first approach on smartphones, optimizing user experience across devices.
- Use minimalistic icons to represent different services and functionalities, enhancing visual communication and ease of navigation.
- Implement subtle transition animations for status updates and task assignments, providing visual feedback and enhancing the user experience.