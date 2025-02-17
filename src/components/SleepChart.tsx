import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { SleepData } from '../types';
import moment from 'moment';
import { api } from '../utils/api';

interface SleepChartProps {
  sleepData: SleepData[] | null;
  className?: string;
}

interface SleepTimes {
  awakeTime: number;
  awakeQuality: number;
  eyeMovementTime: number;
  eyeMovementQuality: number;
  lightSleepTime: number;
  lightSleepQuality: number;
  deepSleepTime: number;
  deepSleepQuality: number;
  totalTime: number;
  sleepQuality: number;
}

const SLEEP_STAGES = {
  AWAKE: { value: 1, name: 'Awake', color: '#FF9F43', bgColor: 'bg-orange-100', textColor: 'text-orange-600' },
  EYE_MOVEMENT: {
    value: 2,
    name: 'Eye Movement',
    color: '#28C76F',
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
  },
  LIGHT_SLEEP: { value: 3, name: 'Light Sleep', color: '#00CFE8', bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
  DEEP_SLEEP: {
    value: 4,
    name: 'Deep Sleep',
    color: '#7367F0',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-600',
  },
} as const;

const initialSleepTimes: SleepTimes = {
  awakeTime: 0,
  awakeQuality: 0,
  eyeMovementTime: 0,
  eyeMovementQuality: 0,
  lightSleepTime: 0,
  lightSleepQuality: 0,
  deepSleepTime: 0,
  deepSleepQuality: 0,
  totalTime: 0,
  sleepQuality: 0,
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
};

export default function SleepChart({ sleepData, className }: SleepChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [currentData, setCurrentData] = useState<SleepData[] | null>(sleepData);
  const [sleepTimes, setSleepTimes] = useState<SleepTimes>(initialSleepTimes);

  const fetchSleepData = async (deviceId: string, start?: string, end?: string) => {
    try {
      const data = await api.getDeviceSleepData(
        deviceId,
        start ? moment(start).toISOString() : undefined,
        end ? moment(end).toISOString() : undefined,
      );

      // Calculate stage qualities based on sleep motion distribution
      const stageQualities = {
        awake: { totalTime: 0, percentage: 0 },
        eyeMovement: { totalTime: 0, percentage: 0 },
        lightSleep: { totalTime: 0, percentage: 0 },
        deepSleep: { totalTime: 0, percentage: 0 },
      };

      // Calculate total time and distribution for each stage
      data.forEach((sleepRecord) => {
        const totalSleepTime = sleepRecord.sleepTotalTime;

        sleepRecord.sleepMotion?.forEach((motion) => {
          const duration = (motion.endTime - motion.startTime) / (60 * 1000); // Convert to minutes

          switch (motion.value) {
            case SLEEP_STAGES.AWAKE.value:
              stageQualities.awake.totalTime += duration;
              break;
            case SLEEP_STAGES.EYE_MOVEMENT.value:
              stageQualities.eyeMovement.totalTime += duration;
              break;
            case SLEEP_STAGES.LIGHT_SLEEP.value:
              stageQualities.lightSleep.totalTime += duration;
              break;
            case SLEEP_STAGES.DEEP_SLEEP.value:
              stageQualities.deepSleep.totalTime += duration;
              break;
          }
        });

        // Calculate percentage of time spent in each stage
        if (totalSleepTime > 0) {
          stageQualities.awake.percentage = (stageQualities.awake.totalTime / totalSleepTime) * 100;
          stageQualities.eyeMovement.percentage = (stageQualities.eyeMovement.totalTime / totalSleepTime) * 100;
          stageQualities.lightSleep.percentage = (stageQualities.lightSleep.totalTime / totalSleepTime) * 100;
          stageQualities.deepSleep.percentage = (stageQualities.deepSleep.totalTime / totalSleepTime) * 100;
        }
      });

      // Calculate average sleep quality from all data (convert from decimal to percentage)
      const avgSleepQuality =
        data.reduce((sum, item) => {
          return sum + (item.sleepQuality || 0) * 100; // Convert decimal to percentage
        }, 0) / (data.length || 1);

      setCurrentData(data);
      setSleepTimes((prev) => ({
        ...prev,
        sleepQuality: prev.sleepQuality,
        awakeQuality: Math.round(stageQualities.awake.percentage),
        eyeMovementQuality: Math.round(stageQualities.eyeMovement.percentage),
        lightSleepQuality: Math.round(stageQualities.lightSleep.percentage),
        deepSleepQuality: Math.round(stageQualities.deepSleep.percentage),
      }));
    } catch (error) {
      console.error('Error fetching sleep data:', error);
      setCurrentData(null);
    }
  };

  useEffect(() => {
    const handleDeviceSelect = (e: CustomEvent) => {
      const { deviceId } = e.detail;
      const start = (document.getElementById('datepicker-range-start') as HTMLInputElement)?.value;
      const end = (document.getElementById('datepicker-range-end') as HTMLInputElement)?.value;
      fetchSleepData(deviceId, start, end);
    };

    const handleDateRangeChange = (e: CustomEvent) => {
      const { start, end } = e.detail;
      const deviceId = document.querySelector('[data-device-list] .bg-blue-50')?.getAttribute('data-device-id');
      if (deviceId) fetchSleepData(deviceId, start, end);
    };

    document.addEventListener('device-select', handleDeviceSelect as EventListener);
    document.addEventListener('daterange-change', handleDateRangeChange as EventListener);
    document.addEventListener('sleep-data-update', ((e: CustomEvent<SleepData[]>) =>
      setCurrentData(e.detail)) as EventListener);

    return () => {
      document.removeEventListener('device-select', handleDeviceSelect as EventListener);
      document.removeEventListener('daterange-change', handleDateRangeChange as EventListener);
      document.removeEventListener('sleep-data-update', ((e: CustomEvent<SleepData[]>) =>
        setCurrentData(e.detail)) as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current);
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current || !currentData?.length) {
      if (chartInstance.current) {
        chartInstance.current.setOption({
          series: [
            {
              data: [],
            },
          ],
        });
      }
      setSleepTimes(initialSleepTimes);
      return;
    }

    const processedData: Array<[number, number, number]> = [];
    const newSleepTimes = { ...initialSleepTimes };
    const activeStages = new Set<number>();

    const sortedData = [...currentData]
      .sort((a, b) => (a.sleepMotion[0]?.startTime || 0) - (b.sleepMotion[0]?.startTime || 0))
      .flatMap(
        (sleep) =>
          sleep.sleepMotion
            ?.sort((a, b) => a.startTime - b.startTime)
            .map((motion) => {
              const duration = (motion.endTime - motion.startTime) / (60 * 1000);
              const stage = Object.values(SLEEP_STAGES).find((s) => s.value === motion.value);

              if (stage) {
                processedData.push([motion.startTime, motion.value, motion.endTime]);
                activeStages.add(motion.value);

                switch (motion.value) {
                  case SLEEP_STAGES.AWAKE.value:
                    newSleepTimes.awakeTime += duration;
                    break;
                  case SLEEP_STAGES.EYE_MOVEMENT.value:
                    newSleepTimes.eyeMovementTime += duration;
                    break;
                  case SLEEP_STAGES.LIGHT_SLEEP.value:
                    newSleepTimes.lightSleepTime += duration;
                    break;
                  case SLEEP_STAGES.DEEP_SLEEP.value:
                    newSleepTimes.deepSleepTime += duration;
                    break;
                }
                newSleepTimes.totalTime += duration;
              }
              return motion;
            }) || [],
      );

    setSleepTimes(newSleepTimes);

    const timeRange = processedData.reduce(
      (range, [time]) => ({
        min: Math.min(range.min, time),
        max: Math.max(range.max, time),
      }),
      { min: Infinity, max: -Infinity },
    );

    const activeStagesList = Object.values(SLEEP_STAGES).filter((stage) => activeStages.has(stage.value));

    const option: echarts.EChartsOption = {
      title: { text: 'Sleep Stages Distribution', left: 'center', top: 0 },
      tooltip: {
        show: true,
        trigger: 'item',
        formatter: (params: any) => {
          const data = params.data;
          if (!data) return '';

          const [startTime, stageValue, endTime] = data;
          const stage = Object.values(SLEEP_STAGES).find((s) => s.value === stageValue)?.name || 'Unknown';

          // Format waktu dalam timezone lokal
          const timeStart = moment(startTime).format('DD/MM HH:mm:ss');
          const timeEnd = moment(endTime).format('DD/MM HH:mm:ss');
          const duration = moment.duration(endTime - startTime).asMinutes();

          let html = `<div style="font-size: 14px;">
            <p style="margin: 0;"><strong>Start:</strong> ${timeStart}</p>
            <p style="margin: 5px 0;"><strong>End:</strong> ${timeEnd}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${Math.round(duration)} minutes</p>
            <p style="margin: 5px 0 0;"><strong>Stage:</strong> ${stage}</p>
          </div>`;

          return html;
        },
        axisPointer: {
          type: 'line',
          lineStyle: { color: '#6B7280', width: 1, type: 'dashed' },
        },
      },
      grid: { left: '5%', right: '5%', bottom: '15%', top: '15%', containLabel: true },
      xAxis: {
        type: 'time',
        min: timeRange.min,
        max: timeRange.max,
        axisLabel: {
          formatter: (value: number) => moment(value).format('DD/MM HH:mm'),
          hideOverlap: true,
        },
        splitLine: { show: true, lineStyle: { type: 'dashed', color: '#E5E7EB' } },
      },
      yAxis: {
        type: 'category',
        data: activeStagesList.map((s) => s.name),
        inverse: true,
        axisLine: { show: true },
        axisTick: { show: true },
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          bottom: '2%',
          height: 20,
          borderColor: 'transparent',
          backgroundColor: '#F3F4F6',
          fillerColor: '#60A5FA',
          handleStyle: { color: '#3B82F6', borderColor: '#2563EB' },
          emphasis: {
            handleStyle: { color: '#2563EB' },
            handleLabel: { show: false },
          },
          textStyle: { color: '#6B7280' },
          start: 0,
          end: 100,
          zoomLock: false,
          moveOnMouseMove: true,
        },
        {
          type: 'inside',
          xAxisIndex: [0],
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
      ],
      series: [
        {
          name: 'Sleep Stage',
          type: 'custom',
          renderItem: (params: echarts.CustomSeriesRenderItemParams, api: echarts.CustomSeriesRenderItemAPI) => {
            const startTime = api.value(0) as number;
            const stageValue = api.value(1) as number;
            const endTime = api.value(2) as number;
            const stageIndex = activeStagesList.findIndex((s) => s.value === stageValue);

            const start = api.coord([startTime, stageIndex]);
            const end = api.coord([endTime, stageIndex]);

            const rectShape = {
              x: start[0],
              y: start[1] - 10,
              width: Math.max(end[0] - start[0], 2),
              height: 20,
            };

            // Cast to unknown first, then to the desired type
            const coordSys = params.coordSys as unknown as { x: number; y: number; width: number; height: number };
            const clippedShape = echarts.graphic.clipRectByRect(rectShape, coordSys);

            return (
              clippedShape && {
                type: 'rect',
                shape: clippedShape,
                style: { fill: activeStagesList[stageIndex].color },
              }
            );
          },
          encode: { x: [0, 2], y: 1 },
          data: processedData,
        },
      ],
      legend: {
        data: activeStagesList.map((stage) => ({
          name: stage.name,
          icon: 'rect',
          itemStyle: { color: stage.color },
        })),
        bottom: 40,
        textStyle: { color: '#4B5563' },
        selectedMode: false,
      },
    };

    chartInstance.current.setOption(option, true);
  }, [currentData]);

  const StageCard = ({ stage, time }: { stage: keyof typeof SLEEP_STAGES; time: number }) => {
    const getQualityForStage = () => {
      switch (stage) {
        case 'AWAKE':
          return sleepTimes.awakeQuality;
        case 'EYE_MOVEMENT':
          return sleepTimes.eyeMovementQuality;
        case 'LIGHT_SLEEP':
          return sleepTimes.lightSleepQuality;
        case 'DEEP_SLEEP':
          return sleepTimes.deepSleepQuality;
      }
    };

    const quality = getQualityForStage();

    return (
      <div className={`p-2 sm:p-3 ${SLEEP_STAGES[stage].bgColor} rounded`}>
        <div
          className={`${SLEEP_STAGES[stage].textColor} text-sm sm:text-base truncate`}
          title={SLEEP_STAGES[stage].name}
        >
          {SLEEP_STAGES[stage].name}
        </div>
        <div className='text-sm sm:text-base truncate'>{formatDuration(time)}</div>
        <div className='text-xs text-gray-600 truncate'>Quality: {quality > 0 ? `${quality}%` : '-'}</div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg p-4 sm:p-6 ${className}`}>
      <div className='mb-4'>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-left mb-4'>
          <div>
            <h5 className='mb-2 text-2xl font-bold text-black'>{formatDuration(sleepTimes.totalTime)}</h5>
            <p className='font-normal text-gray-700 dark:text-gray-400'>
              Sleep Quality: {sleepTimes.sleepQuality > 0 ? `${sleepTimes.sleepQuality}%` : '-'}
            </p>
          </div>
        </div>
      </div>
      <div className='mb-4'>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-center mb-4'>
          <StageCard stage='AWAKE' time={sleepTimes.awakeTime} />
          <StageCard stage='EYE_MOVEMENT' time={sleepTimes.eyeMovementTime} />
          <StageCard stage='LIGHT_SLEEP' time={sleepTimes.lightSleepTime} />
          <StageCard stage='DEEP_SLEEP' time={sleepTimes.deepSleepTime} />
        </div>
      </div>
      <div ref={chartRef} className='w-full' style={{ height: 'min(400px, 50vh)' }} />
    </div>
  );
}
