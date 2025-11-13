// src/services/ApiService.js
class ApiService {
  constructor() {
    this.baseUrl = '/api';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  async saveConsumptionData(data) {
    return await this.request('/consumption', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getConsumptionDataByDateRange(startDate, endDate) {
    return await this.request(`/consumption?startDate=${startDate}&endDate=${endDate}`);
  }

  async getConsumptionDataByDay(date) {
    return await this.request(`/consumption/day/${date}`);
  }

  async getAllData() {
    return await this.request('/consumption');
  }

  async countRecords() {
    const result = await this.request('/consumption/count');
    return result.count;
  }

  async getPaginatedData(page = 1, limit = 20) {
    return await this.request(`/consumption/paginated?page=${page}&limit=${limit}`);
  }

  async saveSetting(key, value) {
    return await this.request(`/settings/${key}`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    });
  }

  async getSetting(key) {
    return await this.request(`/settings/${key}`);
  }
}

export default new ApiService();