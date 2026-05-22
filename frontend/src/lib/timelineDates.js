const asDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatTimelineAxisDate = (value) => {
  const date = asDate(value);
  if (!date) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
};

export const formatTimelineTooltipDate = (value) => {
  const date = asDate(value);
  if (!date) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
