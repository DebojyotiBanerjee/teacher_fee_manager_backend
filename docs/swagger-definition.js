module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Teacher Fee Manager API',
    version: '1.0.0',
    description: 'API documentation for the Teacher Fee Manager backend'
  },
  servers: [
    {
      url: 'http://localhost:8080',
      description: 'Local server'
    }
  ],
  components: {},
  security: [],
  tags: [
    { name: 'Auth', description: 'Authentication routes' },
    { name: 'Teacher', description: 'Teacher routes' },
    { name: 'Student', description: 'Student routes' }
  ]
};