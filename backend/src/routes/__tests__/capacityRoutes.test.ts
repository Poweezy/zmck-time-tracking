import express from 'express';
import request from 'supertest';
import { capacityRoutes } from '../capacity';
import { getCapacitySummary, getCapacityForecast } from '../../services/capacityService';

const mockUserState = {
  current: { id: 1, role: 'admin' as 'admin' | 'supervisor' | 'engineer' },
};

jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = mockUserState.current;
    next();
  },
}));

jest.mock('../../services/capacityService', () => ({
  getCapacitySummary: jest.fn(),
  getCapacityForecast: jest.fn(),
}));

const mockGetCapacitySummary = getCapacitySummary as jest.MockedFunction<typeof getCapacitySummary>;
const mockGetCapacityForecast = getCapacityForecast as jest.MockedFunction<typeof getCapacityForecast>;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/capacity', capacityRoutes);
  return app;
};

describe('capacityRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserState.current = { id: 1, role: 'admin' };
  });

  describe('GET /api/capacity/summary', () => {
    it('returns summary data for admins', async () => {
      mockGetCapacitySummary.mockResolvedValue({
        period: { from: '2025-01-01', to: '2025-01-31' },
        teamTotals: { capacityHours: 160, loggedHours: 120, avgUtilization: 75 },
        members: [],
      });

      const app = buildApp();
      const response = await request(app).get('/api/capacity/summary?from=2025-01-01');

      expect(response.status).toBe(200);
      expect(mockGetCapacitySummary).toHaveBeenCalledWith({
        from: '2025-01-01',
        to: undefined,
        userId: undefined,
      });
    });

    it('prevents engineers from requesting other users', async () => {
      mockUserState.current = { id: 5, role: 'engineer' };
      const app = buildApp();
      const response = await request(app).get('/api/capacity/summary?userId=2');

      expect(response.status).toBe(403);
      expect(mockGetCapacitySummary).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/capacity/forecast', () => {
    it('validates weeks parameter', async () => {
      const app = buildApp();
      const response = await request(app).get('/api/capacity/forecast?weeks=12');

      expect(response.status).toBe(400);
      expect(mockGetCapacityForecast).not.toHaveBeenCalled();
    });

    it('calls service with includeProjectMix flag', async () => {
      mockGetCapacityForecast.mockResolvedValue({
        window: { start: '2025-01-06', weeks: 2, weekStartsOn: 1 },
        weeks: [],
      });

      const app = buildApp();
      const response = await request(app).get('/api/capacity/forecast?weeks=3&includeProjectMix=true');

      expect(response.status).toBe(200);
      expect(mockGetCapacityForecast).toHaveBeenCalledWith({
        start: undefined,
        weeks: 3,
        userId: undefined,
        includeProjectMix: true,
      });
    });

    it('enforces engineer visibility rules', async () => {
      mockUserState.current = { id: 7, role: 'engineer' };
      const app = buildApp();
      const response = await request(app).get('/api/capacity/forecast?userId=8');

      expect(response.status).toBe(403);
      expect(mockGetCapacityForecast).not.toHaveBeenCalled();
    });
  });
});

