'use client';

import Calendar from 'react-calendar';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// You can create a new CSS file for the calendar styles or add them to your global CSS.
// For simplicity, I'm defining them here. You can move them to globals.css.
const calendarStyles = `
.react-calendar {
  width: 100%;
  max-width: 350px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  padding: 1rem;
  font-family: var(--font-sans);
  line-height: 1.125em;
  color: hsl(var(--foreground));
}
.react-calendar--doubleView {
  width: 700px;
}
.react-calendar--doubleView .react-calendar__viewContainer {
  display: flex;
  margin: -0.5em;
}
.react-calendar--doubleView .react-calendar__viewContainer > * {
  width: 50%;
  margin: 0.5em;
}
.react-calendar,
.react-calendar *,
.react-calendar *:before,
.react-calendar *:after {
  -moz-box-sizing: border-box;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
}
.react-calendar button {
  margin: 0;
  border: 0;
  outline: none;
  border-radius: var(--radius);
}
.react-calendar button:enabled:hover {
  cursor: pointer;
  background-color: hsl(var(--accent));
}
.react-calendar__navigation {
  display: flex;
  height: 44px;
  margin-bottom: 1em;
}
.react-calendar__navigation button {
  min-width: 44px;
  background: none;
  color: hsl(var(--foreground));
  font-weight: 600;
}
.react-calendar__navigation button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.react-calendar__navigation button:enabled:hover,
.react-calendar__navigation button:enabled:focus {
  background-color: hsl(var(--accent));
}
.react-calendar__month-view__weekdays {
  text-align: center;
  text-transform: uppercase;
  font-weight: bold;
  font-size: 0.75em;
  color: hsl(var(--muted-foreground));
}
.react-calendar__month-view__weekdays__weekday {
  padding: 0.5em;
}
.react-calendar__month-view__weekNumbers .react-calendar__tile {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75em;
  font-weight: bold;
}
.react-calendar__month-view__days__day--weekend {
  color: hsl(var(--destructive));
}
.react-calendar__month-view__days__day--neighboringMonth {
  color: hsl(var(--muted-foreground));
}
.react-calendar__year-view .react-calendar__tile,
.react-calendar__decade-view .react-calendar__tile,
.react-calendar__century-view .react-calendar__tile {
  padding: 2em 0.5em;
}
.react-calendar__tile {
  max-width: 100%;
  padding: 0.75rem 0.5rem;
  background: none;
  text-align: center;
  line-height: 16px;
  aspect-ratio: 1/1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.react-calendar__tile:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.react-calendar__tile:enabled:hover,
.react-calendar__tile:enabled:focus {
  background-color: hsl(var(--accent));
}
.react-calendar__tile--now {
  background: hsl(var(--accent));
  font-weight: bold;
  color: hsl(var(--accent-foreground));
}
.react-calendar__tile--now:enabled:hover,
.react-calendar__tile--now:enabled:focus {
  background: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}
.react-calendar__tile--hasActive {
  background: hsl(var(--accent));
}
.react-calendar__tile--hasActive:enabled:hover,
.react-calendar__tile--hasActive:enabled:focus {
  background: hsl(var(--accent));
}
.react-calendar__tile--active {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  font-weight: bold;
}
.react-calendar__tile--active:enabled:hover,
.react-calendar__tile--active:enabled:focus {
  background: hsl(var(--primary));
}
.react-calendar--selectRange .react-calendar__tile--hover {
  background-color: hsl(var(--accent));
}
`;

export const ReactCalendar = (props: any) => {
  return (
    <>
      <style>{calendarStyles}</style>
      <Calendar
        next2Label={null}
        prev2Label={null}
        nextLabel={<ChevronRight />}
        prevLabel={<ChevronLeft />}
        {...props}
      />
    </>
  );
};
