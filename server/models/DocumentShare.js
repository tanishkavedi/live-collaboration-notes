const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const DocumentShare = sequelize.define('DocumentShare', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  docId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  inviteeEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('view', 'edit'),
    defaultValue: 'view'
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  acceptedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: true  // null until they accept
  }
});

module.exports = DocumentShare;