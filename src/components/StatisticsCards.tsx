import type { FC } from 'react';

interface StatisticsCardsProps {
  deviceCount: number;
  offlineCount: number;
  heartRateStats: {
    avgBpm: number;
    maxBpm: number;
    minBpm: number;
  };
  sleepStats: {
    avgDuration: number;
    maxDuration: number;
    minDuration: number;
  };
}

const InfoIcon = () => (
  <div className='bg-blue-100 rounded-full p-2'>
    <svg className='w-6 h-6 text-blue-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='2'
        d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
      />
    </svg>
  </div>
);

const StatisticsCards: FC<StatisticsCardsProps> = ({ deviceCount, offlineCount, heartRateStats, sleepStats }) => {
  return (
    <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
      <div className='bg-[#474F7C] p-6 rounded-lg flex items-center justify-between text-white'>
        <div>
          <h3 className='text-2xl md:text-4xl font-bold mb-2'>{deviceCount}</h3>
          <p className='text-sm opacity-80'>Device Registered</p>
        </div>
      </div>

      <div className='bg-white p-6 rounded-lg flex items-center justify-between'>
        <div>
          <h3 className='text-2xl md:text-4xl font-bold mb-2'>{offlineCount}</h3>
          <p className='text-sm text-gray-600'>Device Offline</p>
        </div>
      </div>

      <div className='bg-white p-6 rounded-lg'>
        <div className='flex justify-between items-start mb-4'>
          <div>
            <h3 className='text-2xl md:text-4xl font-bold'>{heartRateStats.avgBpm} bpm</h3>
            <p className='text-sm text-gray-600'>Recommended Heart Rate</p>
          </div>
        </div>
        <div className='flex items-center space-x-1 text-sm text-gray-600'>
          <span>{heartRateStats.maxBpm} bpm</span>
          <span>•</span>
          <span>{heartRateStats.minBpm} bpm</span>
        </div>
      </div>

      <div className='bg-white p-6 rounded-lg'>
        <div className='flex justify-between items-start mb-4'>
          <div>
            <h3 className='text-2xl md:text-4xl font-bold'>{sleepStats.avgDuration} h</h3>
            <p className='text-sm text-gray-600'>Recommended Sleep Time</p>
          </div>
        </div>
        <div className='text-sm text-gray-600'>
          <span>{sleepStats.maxDuration} h </span>
          <span>• </span>
          <span>{sleepStats.minDuration} h </span>
        </div>
      </div>
    </div>
  );
};

export default StatisticsCards;
