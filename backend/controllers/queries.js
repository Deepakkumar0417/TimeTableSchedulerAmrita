import Query from '../models/query.model.js';

export const listQueries = async (_req, res) => {
  try {
    const rows = await Query.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: rows });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const setQueryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['open','pending','resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const doc = await Query.findByIdAndUpdate(id, { status }, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Query not found' });
    return res.status(200).json({ success: true, data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const replyQuery = async (req, res) => {
  try {
    // You can store replies in a separate collection or just update status here.
    // For now, mark pending -> open/resolved based on your workflow.
    const { id } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Reply message is required' });
    // TODO: Persist replies if needed
    const doc = await Query.findByIdAndUpdate(id, { status: 'pending' }, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Query not found' });
    return res.status(200).json({ success: true, message: 'Reply noted', data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
