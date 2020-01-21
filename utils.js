const getTimestamp = (date) => {
  let dateString;
  const dateFormatRegex = /([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/;
  if (date === 'today') {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    dateString = `${yyyy}-${mm}-${dd}`;

  } else if (date.match(dateFormatRegex)) {
    dateString = date;

  } else {
    throw Error('input is not in a valid date format');
  }

  console.log(dateString)
  const res = new Date(dateString).getTime();
  return res;
}

module.exports = {
  getTimestamp,
}