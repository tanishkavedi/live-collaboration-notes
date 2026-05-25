const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    defaultValue: 'Untitled'
  },
  content: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastEditedBy: {
    type: DataTypes.STRING
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
});

module.exports = Document;