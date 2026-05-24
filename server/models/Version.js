const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Version = sequelize.define('Version', {
  docId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  editedBy: {
    type: DataTypes.STRING,
    allowNull: false
  },
  delta: {
    type: DataTypes.TEXT
  }
});

module.exports = Version;