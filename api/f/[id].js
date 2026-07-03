module.exports = (req, res) => {
  const { id } = req.query;
  if (!id) {
    res.status(400).send('ID file ga ada.');
    return;
  }
  res.writeHead(302, { Location: `https://drive.google.com/uc?export=view&id=${id}` });
  res.end();
};
