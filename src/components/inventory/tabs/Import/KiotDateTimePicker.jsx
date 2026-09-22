import React, { useState, useEffect, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

const KiotDateTimePicker = ({ value, onChange, onClose }) => {
  const initialDate = useMemo(() => (value ? dayjs(value) : dayjs()), [value]);
  const [tempDate, setTempDate] = useState(initialDate);
  const [viewMonth, setViewMonth] = useState(initialDate.startOf('month'));

  const hourRef = useRef(null);
  const minuteRef = useRef(null);
  const secondRef = useRef(null);

  useEffect(() => {
    if (value) {
      const d = dayjs(value);
      setTempDate(d);
      setViewMonth(d.startOf('month'));
    }
  }, [value]);

  // Scroll active hour/minute/second into view on open
  useEffect(() => {
    const timer = setTimeout(() => {
      const hEl = hourRef.current?.querySelector('.active-time-item');
      if (hEl) hEl.scrollIntoView({ block: 'center' });

      const mEl = minuteRef.current?.querySelector('.active-time-item');
      if (mEl) mEl.scrollIntoView({ block: 'center' });

      const sEl = secondRef.current?.querySelector('.active-time-item');
      if (sEl) sEl.scrollIntoView({ block: 'center' });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handlePrevMonth = () => {
    setViewMonth((prev) => prev.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setViewMonth((prev) => prev.add(1, 'month'));
  };

  const handleSelectDay = (dayObj) => {
    const updated = tempDate
      .year(dayObj.year())
      .month(dayObj.month())
      .date(dayObj.date());
    setTempDate(updated);
  };

  const handleSelectHour = (h) => {
    setTempDate((prev) => prev.hour(h));
  };

  const handleSelectMinute = (m) => {
    setTempDate((prev) => prev.minute(m));
  };

  const handleSelectSecond = (s) => {
    setTempDate((prev) => prev.second(s));
  };

  const handleSetCurrentTime = () => {
    const now = dayjs();
    setTempDate(now);
    setViewMonth(now.startOf('month'));

    setTimeout(() => {
      hourRef.current?.querySelector('.active-time-item')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      minuteRef.current?.querySelector('.active-time-item')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      secondRef.current?.querySelector('.active-time-item')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 50);
  };

  const handleConfirm = () => {
    onChange(tempDate);
    onClose();
  };

  // Generate 42 days for calendar matrix
  const daysMatrix = useMemo(() => {
    const startOfMonth = viewMonth.startOf('month');
    const daysInMonth = viewMonth.daysInMonth();
    
    // Day of week (0=Sunday, 1=Monday ... 6=Saturday)
    // We want Monday=0, Tuesday=1 ... Sunday=6
    const firstDayOfWeek = (startOfMonth.day() + 6) % 7;
    
    const prevMonth = viewMonth.subtract(1, 'month');
    const prevDaysInMonth = prevMonth.daysInMonth();

    const cells = [];

    // Previous month padding days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevDaysInMonth - i;
      const dObj = prevMonth.date(dayNum);
      cells.push({ dateObj: dObj, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dObj = viewMonth.date(d);
      cells.push({ dateObj: dObj, isCurrentMonth: true });
    }

    // Next month padding days
    const nextMonth = viewMonth.add(1, 'month');
    const remaining = 42 - cells.length;
    for (let n = 1; n <= remaining; n++) {
      const dObj = nextMonth.date(n);
      cells.push({ dateObj: dObj, isCurrentMonth: false });
    }

    return cells;
  }, [viewMonth]);

  const selectedDayNum = tempDate.date();
  const selectedMonthNum = tempDate.month();
  const selectedYearNum = tempDate.year();

  const hoursArray = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutesArray = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  const secondsArray = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  return (
    <div
      style={{
        position: 'absolute',
        top: 36,
        right: 0,
        width: 410,
        boxSizing: 'border-box',
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: 12,
        boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15)',
        zIndex: 9999,
        padding: 12,
        fontSize: 12,
        userSelect: 'none'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* LEFT COLUMN: CALENDAR (YEAR - MONTH - DAY) */}
        <div style={{ width: 235, display: 'flex', flexDirection: 'column' }}>
          {/* MONTH HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569'
              }}
            >
              <LeftOutlined style={{ fontSize: 10 }} />
            </button>

            <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
              Tháng {viewMonth.month() + 1} {viewMonth.year()}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569'
              }}
            >
              <RightOutlined style={{ fontSize: 10 }} />
            </button>
          </div>

          {/* DAY NAMES HEADER */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: 11, marginBottom: 4 }}>
            <div>T2</div>
            <div>T3</div>
            <div>T4</div>
            <div>T5</div>
            <div>T6</div>
            <div>T7</div>
            <div>CN</div>
          </div>

          {/* DAYS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
            {daysMatrix.map((cell, idx) => {
              const d = cell.dateObj;
              const isSelected =
                cell.isCurrentMonth &&
                d.date() === selectedDayNum &&
                d.month() === selectedMonthNum &&
                d.year() === selectedYearNum;

              const isToday =
                d.date() === dayjs().date() &&
                d.month() === dayjs().month() &&
                d.year() === dayjs().year();

              return (
                <div
                  key={idx}
                  onClick={() => handleSelectDay(d)}
                  style={{
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    color: isSelected
                      ? '#ffffff'
                      : cell.isCurrentMonth
                      ? '#0f172a'
                      : '#cbd5e1',
                    background: isSelected
                      ? '#e8442a'
                      : isToday
                      ? '#fff1ec'
                      : 'transparent',
                    border: isToday && !isSelected ? '1px solid #fed7aa' : 'none',
                    transition: 'all 0.1s ease'
                  }}
                >
                  {d.date()}
                </div>
              );
            })}
          </div>

          {/* FOOTER LEFT: CURRENT TIME BUTTON */}
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleSetCurrentTime}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e8442a',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                padding: 0
              }}
            >
              Hiện tại
            </button>
          </div>
        </div>

        {/* VERTICAL DIVIDER LINE */}
        <div style={{ width: 1, height: 250, background: '#e2e8f0' }} />

        {/* RIGHT COLUMN: TIME SELECTOR (GIỜ - PHÚT - GIÂY SCROLLABLE) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* DIGITAL TIME DISPLAY HEADER */}
          <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#e8442a', marginBottom: 8, padding: '3px 0', background: '#fff1ec', borderRadius: 6, border: '1px solid #fed7aa' }}>
            {tempDate.format('HH:mm:ss')}
          </div>

          {/* TIME SCROLL LISTS (GIỜ - PHÚT - GIÂY FIXED HEIGHT CONTAINER) */}
          <div style={{ display: 'flex', gap: 2, height: 180, overflow: 'hidden' }}>
            {/* GIỜ (00-23) */}
            <div
              ref={hourRef}
              style={{
                flex: 1,
                height: 180,
                maxHeight: 180,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, marginBottom: 2, textTransform: 'uppercase' }}>Giờ</div>
              {hoursArray.map((h) => {
                const isActive = tempDate.hour() === h;
                return (
                  <div
                    key={h}
                    className={isActive ? 'active-time-item' : ''}
                    onClick={() => handleSelectHour(h)}
                    style={{
                      height: 24,
                      minHeight: 24,
                      width: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: isActive ? 700 : 500,
                      background: isActive ? '#fff1ec' : 'transparent',
                      color: isActive ? '#e8442a' : '#475569'
                    }}
                  >
                    {String(h).padStart(2, '0')}
                  </div>
                );
              })}
            </div>

            {/* PHÚT (00-59) */}
            <div
              ref={minuteRef}
              style={{
                flex: 1,
                height: 180,
                maxHeight: 180,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, marginBottom: 2, textTransform: 'uppercase' }}>Phút</div>
              {minutesArray.map((m) => {
                const isActive = tempDate.minute() === m;
                return (
                  <div
                    key={m}
                    className={isActive ? 'active-time-item' : ''}
                    onClick={() => handleSelectMinute(m)}
                    style={{
                      height: 24,
                      minHeight: 24,
                      width: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: isActive ? 700 : 500,
                      background: isActive ? '#fff1ec' : 'transparent',
                      color: isActive ? '#e8442a' : '#475569'
                    }}
                  >
                    {String(m).padStart(2, '0')}
                  </div>
                );
              })}
            </div>

            {/* GIÂY (00-59) */}
            <div
              ref={secondRef}
              style={{
                flex: 1,
                height: 180,
                maxHeight: 180,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, marginBottom: 2, textTransform: 'uppercase' }}>Giây</div>
              {secondsArray.map((s) => {
                const isActive = tempDate.second() === s;
                return (
                  <div
                    key={s}
                    className={isActive ? 'active-time-item' : ''}
                    onClick={() => handleSelectSecond(s)}
                    style={{
                      height: 24,
                      minHeight: 24,
                      width: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: isActive ? 700 : 500,
                      background: isActive ? '#fff1ec' : 'transparent',
                      color: isActive ? '#e8442a' : '#475569'
                    }}
                  >
                    {String(s).padStart(2, '0')}
                  </div>
                );
              })}
            </div>
          </div>

          {/* FOOTER RIGHT: OK BUTTON */}
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleConfirm}
              style={{
                background: '#e8442a',
                color: '#ffffff',
                border: 'none',
                borderRadius: 16,
                padding: '4px 18px',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KiotDateTimePicker;
