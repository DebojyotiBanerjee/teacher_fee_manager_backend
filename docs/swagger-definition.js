module.exports = {
  openapi: "3.0.0",
  info: {
    title: "Teacher Fee Manager API",
    version: "1.0.0",
    description: "API documentation for the Teacher Fee Manager backend",
  },
  servers: [
    {
      url: "http://localhost:8080",
      description: "Local server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          fullname: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          status: { type: "string", enum: ["online", "offline"] },
          role: { type: "string", enum: ["teacher", "student"] },
          isVerified: { type: "boolean" },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      DetailTeacher: {
        type: "object",
        properties: {
          _id: { type: "string" },
          user: { $ref: "#/components/schemas/User" },
          qualifications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                degree: { type: "string" },
                institution: { type: "string" },
                yearCompleted: { type: "integer" },
              },
            },
          },
          experience: {
            type: "object",
            properties: {
              years: { type: "integer" },
              previousInstitutions: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
          bio: { type: "string" },
          subjectsTaught: { type: "array", items: { type: "string" } },
          availability: { type: "object" },
          socialMedia: { type: "object" },
          batches: { type: "array", items: { type: "string" } },
          ratings: { type: "array", items: { type: "string" } },
          averageRating: { type: "number" },
          totalRatings: { type: "integer" },
          isProfileComplete: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      DetailStudent: {
        type: "object",
        properties: {
          _id: { type: "string" },
          user: { $ref: "#/components/schemas/User" },
          education: {
            type: "object",
            properties: {
              currentLevel: { type: "string" },
              institution: { type: "string" },
              grade: { type: "string" },
              yearOfStudy: { type: "integer" },
              board: { type: "string" },
            },
          },
          subjects: {
            type: "array",
            items: {
              type: "object",
              properties: {
                subject: { type: "string" },
                proficiencyLevel: {
                  type: "string",
                  enum: ["beginner", "intermediate", "advanced"],
                },
                targetScore: { type: "number" },
                currentScore: { type: "number" },
              },
            },
          },
          enrolledBatches: { type: "array", items: { type: "string" } },
          academicPerformance: { type: "object" },
          guardian: { type: "object" },
          address: { type: "object" },
          ratings: { type: "array", items: { type: "string" } },
          isProfileComplete: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Batch: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          teacher: { type: "string" },
          subject: { type: "string" },
          schedule: { type: "object" },
          students: { type: "array", items: { type: "string" } },
          maxStudents: { type: "integer" },
          fee: { type: "number" },
          ratings: { type: "array", items: { type: "string" } },
          averageRating: { type: "number" },
          totalRatings: { type: "integer" },
          status: {
            type: "string",
            enum: ["upcoming", "ongoing", "completed", "cancelled"],
          },
          description: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Rating: {
        type: "object",
        properties: {
          _id: { type: "string" },
          teacherId: { type: "string" },
          batchId: { type: "string" },
          subjectId: { type: "string" },
          studentId: { type: "string" },
          rating: { type: "number", minimum: 1, maximum: 5 },
          comment: { type: "string" },
          type: { type: "string", enum: ["teacher", "batch", "subject"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Auth", description: "Authentication routes" },
    { name: "Teacher", description: "Teacher routes" },
    { name: "Student", description: "Student routes" },
    { name: "Batch", description: "Batch routes" },
    { name: "Rating", description: "Rating routes" },
  ],
};
