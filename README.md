# Features

## Authentication

* User signup
* User login
* Password hashing using bcrypt
* JWT-based authentication
* Automatic login verification using stored tokens
* Username availability checking during signup

## Real-Time Chat

* Real-time messaging using Socket.IO
* Instant message broadcasting within rooms
* Live message updates without page refresh

## Chat Rooms

* Create chat rooms
* Delete chat rooms
* Public and private room support
* Room-based message isolation
* Room membership management

## Invite System

* Generate invite links for rooms
* Invite links with expiration times
* Invite links with maximum usage limits
* Join private rooms through invite links
* Invite validation before joining

## Member Management

* Live member list for each room
* Join notifications
* Leave notifications
* Active user tracking per room

## Chat Interface

* Dedicated chat area
* Message input and submission
* Automatic scrolling to the latest message
* Room sidebar navigation

## Database Integration

* MySQL database integration
* Persistent user storage
* Persistent room storage
* Room membership storage
* Invite storage and tracking

# Security Features

## Password Security

* Passwords are hashed using bcrypt before storage
* Plain-text passwords are never stored in the database

## Authentication Security

* JWT token generation
* JWT token verification
* Token expiration support
* Protected login verification endpoint

## Access Control

* Private room access restrictions
* Invite-based access to private rooms
* Room deletion restricted to room administrators
* Invite generation permissions for private rooms

## Database Security

* Parameterized SQL queries using placeholders (`?`)
* Protection against SQL injection attacks
