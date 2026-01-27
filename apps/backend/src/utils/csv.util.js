exports.toCSV = (rows) => {
  if (!rows.length) return '';

  const headers = Object.keys(rows[0]).join(',');
  const data = rows.map(r =>
    Object.values(r).map(v => `"${v ?? ''}"`).join(',')
  );

  return [headers, ...data].join('\n');
};
