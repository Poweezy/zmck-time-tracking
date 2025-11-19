import { getCapacitySummary, getCapacityForecast } from '../capacityService';
import { db } from '../../db';

const mockDb = db as unknown as jest.Mock;

const createQueryBuilder = (rows: any[]) => {
  const builder: any = {};
  const chainableMethods = [
    'select',
    'where',
    'andWhere',
    'whereIn',
    'andWhereBetween',
    'groupBy',
    'leftJoin',
    'count',
    'countDistinct',
    'sum',
    'orderBy',
    'limit',
    'offset',
  ];

  chainableMethods.forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });

  builder.then = (resolve?: (value: any) => void) => {
    return Promise.resolve(resolve ? resolve(rows) : rows);
  };

  builder.catch = jest.fn(() => builder);
  builder.returning = jest.fn(() => builder);
  builder.insert = jest.fn(() => builder);
  builder.update = jest.fn(() => builder);
  builder.delete = jest.fn(() => builder);
  builder.clone = jest.fn(() => builder);
  builder[Symbol.toStringTag] = 'Promise';

  return builder;
};

jest.mock('../../db', () => ({
  db: jest.fn(),
}));

describe('capacityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCapacitySummary', () => {
    it('calculates utilization and alerts for engineers', async () => {
      mockDb.mockImplementation((table: string) => {
        switch (table) {
          case 'users':
            return createQueryBuilder([
              { id: 1, first_name: 'Alice', last_name: 'Eng', role: 'engineer' },
              { id: 2, first_name: 'Bob', last_name: 'Builder', role: 'engineer' },
            ]);
          case 'time_entries':
            return createQueryBuilder([
              { user_id: 1, logged: 120 },
              { user_id: 2, logged: 80 },
            ]);
          case 'tasks':
            return createQueryBuilder([
              { user_id: 1, task_count: '5', project_count: '2' },
              { user_id: 2, task_count: '3', project_count: '1' },
            ]);
          default:
            throw new Error(`Unexpected table: ${table}`);
        }
      });

      const summary = await getCapacitySummary({});

      expect(summary.members).toHaveLength(2);
      expect(summary.members).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 1,
            projects: 2,
            tasks: 5,
            loggedHours: 120,
            utilization: 75,
            alert: 'normal',
          }),
          expect.objectContaining({
            userId: 2,
            projects: 1,
            tasks: 3,
            loggedHours: 80,
            utilization: 50,
            alert: 'normal',
          }),
        ])
      );
      expect(summary.teamTotals.avgUtilization).toBeCloseTo(62.5);
    });
  });

  describe('getCapacityForecast', () => {
    it('returns weekly allocations with project mix data', async () => {
      mockDb.mockImplementation((table: string) => {
        switch (table) {
          case 'users':
            return createQueryBuilder([{ id: 1, first_name: 'Alice', last_name: 'Eng', role: 'engineer' }]);
          case 'tasks':
            return createQueryBuilder([
              {
                id: 10,
                assigned_to: 1,
                project_id: 7,
                estimated_hours: 50,
                due_date: '2025-05-05',
                status: 'in_progress',
                project_name: 'Airport Upgrade',
              },
              {
                id: 11,
                assigned_to: 1,
                project_id: 8,
                estimated_hours: null,
                due_date: null,
                status: 'todo',
                project_name: 'Bridge Repair',
              },
            ]);
          default:
            throw new Error(`Unexpected table: ${table}`);
        }
      });

      const forecast = await getCapacityForecast({
        start: '2025-05-05',
        weeks: 2,
        includeProjectMix: true,
      });

      expect(forecast.weeks).toHaveLength(2);
      const firstWeek = forecast.weeks[0];
      expect(firstWeek.allocations).toHaveLength(1);
      expect(firstWeek.allocations[0]).toMatchObject({
        userId: 1,
        name: 'Alice Eng',
        hours: 56,
        utilization: 140,
        status: 'overbooked',
      });
      expect(firstWeek.allocations[0].topProjects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ project: 'Airport Upgrade', hours: 50 }),
          expect.objectContaining({ project: 'Bridge Repair', hours: 6 }),
        ])
      );
    });
  });
});

